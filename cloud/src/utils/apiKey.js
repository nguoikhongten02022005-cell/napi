export function extractBearerToken(request) {
  const header = request?.headers?.get?.("authorization") || request?.headers?.get?.("Authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

export async function parseApiKey(apiKey) {
  if (typeof apiKey !== "string") return null;
  const match = /^sk-([^-]+)-([^-]+)-([a-z0-9]+)$/i.exec(apiKey.trim());
  if (!match) return null;

  return {
    machineId: match[1],
    keyId: match[2],
    isNewFormat: true,
  };
}
