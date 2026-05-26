import { getModelInfoCore } from "../../../open-sse/services/model.js";
import { handleEmbeddingsCore } from "../../../open-sse/handlers/embeddingsCore.js";
import { errorResponse, buildErrorBody } from "../../../open-sse/utils/error.js";
import { HTTP_STATUS } from "../../../open-sse/config/runtimeConfig.js";
import * as log from "../utils/logger.js";
import { extractBearerToken, parseApiKey } from "../utils/apiKey.js";
import { getMachineData, saveMachineData } from "../services/storage.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function corsResponse(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonError(status, message) {
  const response = errorResponse(status, message);
  return corsResponse(response);
}

function rateLimitedResponse(message, retryAfterSeconds) {
  return new Response(JSON.stringify(buildErrorBody(HTTP_STATUS.RATE_LIMITED, message)), {
    status: HTTP_STATUS.RATE_LIMITED,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Retry-After": String(Math.max(1, retryAfterSeconds)),
    },
  });
}

function parseRetryAfter(rateLimitedUntil) {
  if (!rateLimitedUntil) return 0;
  const ts = new Date(rateLimitedUntil).getTime();
  if (!Number.isFinite(ts)) return 0;
  return Math.max(1, Math.ceil((ts - Date.now()) / 1000));
}

function pickProviderConnection(machineData, provider) {
  const connections = Object.entries(machineData?.providers || {})
    .map(([connectionId, value]) => ({ connectionId, ...value }))
    .filter((connection) => connection.provider === provider && connection.isActive !== false)
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));

  if (connections.length === 0) return { connection: null, retryAfter: 0 };

  let firstRetryAfter = 0;
  for (const connection of connections) {
    const retryAfter = parseRetryAfter(connection.rateLimitedUntil);
    if (retryAfter > 0 || connection.status === "unavailable") {
      firstRetryAfter = firstRetryAfter || retryAfter;
      continue;
    }
    return { connection, retryAfter: 0 };
  }

  return { connection: null, retryAfter: firstRetryAfter || 1 };
}

export async function handleEmbeddings(request, env = {}, ctx = {}, machineIdOverride = null) {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(HTTP_STATUS.BAD_REQUEST, "Invalid JSON body");
  }

  const token = extractBearerToken(request);
  if (!token) {
    return jsonError(HTTP_STATUS.UNAUTHORIZED, "Missing API key");
  }

  const parsedKey = await parseApiKey(token);
  if (!parsedKey) {
    return jsonError(HTTP_STATUS.UNAUTHORIZED, "Invalid API key format");
  }

  if (!machineIdOverride && parsedKey.isNewFormat === false) {
    return jsonError(HTTP_STATUS.BAD_REQUEST, "Please use the machineId endpoint");
  }

  const machineId = machineIdOverride || parsedKey.machineId;
  const machineData = await getMachineData(env, machineId);
  if (!machineData) {
    return jsonError(HTTP_STATUS.BAD_REQUEST, "No credentials for machine");
  }

  const apiKeyValid = Array.isArray(machineData.apiKeys) && machineData.apiKeys.some((entry) => {
    if (!entry) return false;
    if (typeof entry === "string") return entry === token;
    return entry.key === token;
  });

  if (!apiKeyValid) {
    return jsonError(HTTP_STATUS.UNAUTHORIZED, "Invalid API key");
  }

  if (!body.model) {
    return jsonError(HTTP_STATUS.BAD_REQUEST, "Missing model");
  }

  if (!body.input) {
    return jsonError(HTTP_STATUS.BAD_REQUEST, "Missing required field: input");
  }

  const modelInfo = await getModelInfoCore(body.model);
  if (!modelInfo?.provider) {
    return jsonError(HTTP_STATUS.BAD_REQUEST, "Invalid model format");
  }

  const { connection, retryAfter } = pickProviderConnection(machineData, modelInfo.provider);
  if (!connection) {
    if ((machineData?.providers && Object.keys(machineData.providers).length > 0) && retryAfter > 0) {
      return rateLimitedResponse(`[${modelInfo.provider}/${modelInfo.model}] Rate limit exceeded`, retryAfter);
    }
    return jsonError(HTTP_STATUS.BAD_REQUEST, `No credentials for provider: ${modelInfo.provider}`);
  }

  const credentials = {
    connectionId: connection.connectionId,
    connectionName: connection.name || connection.connectionName || connection.connectionId,
    provider: connection.provider,
    apiKey: connection.apiKey,
    accessToken: connection.accessToken,
    refreshToken: connection.refreshToken,
    providerSpecificData: connection.providerSpecificData || {},
  };

  const result = await handleEmbeddingsCore({
    body: { ...body, model: `${modelInfo.provider}/${modelInfo.model}` },
    modelInfo,
    credentials,
    log,
    onCredentialsRefreshed: async () => {},
    onRequestSuccess: async () => {
      await saveMachineData(env, machineId, machineData);
    },
  });

  if (result.success) {
    return corsResponse(result.response);
  }

  if (result.response instanceof Response) {
    return corsResponse(result.response);
  }

  return jsonError(result.status || HTTP_STATUS.SERVER_ERROR, result.error || "Embeddings failed");
}
