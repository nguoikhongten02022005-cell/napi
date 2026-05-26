import { NextResponse } from "next/server";
import { access, constants } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const ACCESS_TOKEN_KEYS = ["cursorAuth/accessToken", "cursorAuth/token"];
const MACHINE_ID_KEYS = [
  "storage.serviceMachineId",
  "storage.machineId",
  "telemetry.machineId",
];

const SUPPORTED_PLATFORMS = new Set(["darwin", "linux", "win32"]);

/** Get candidate db paths by platform */
function getCandidatePaths(platform) {
  const home = homedir();

  if (platform === "darwin") {
    return [
      join(
        home,
        "Library/Application Support/Cursor/User/globalStorage/state.vscdb",
      ),
      join(
        home,
        "Library/Application Support/Cursor - Insiders/User/globalStorage/state.vscdb",
      ),
    ];
  }

  if (platform === "win32") {
    const appData = process.env.APPDATA || join(home, "AppData", "Roaming");
    const localAppData =
      process.env.LOCALAPPDATA || join(home, "AppData", "Local");
    return [
      join(appData, "Cursor", "User", "globalStorage", "state.vscdb"),
      join(
        appData,
        "Cursor - Insiders",
        "User",
        "globalStorage",
        "state.vscdb",
      ),
      join(localAppData, "Cursor", "User", "globalStorage", "state.vscdb"),
      join(
        localAppData,
        "Programs",
        "Cursor",
        "User",
        "globalStorage",
        "state.vscdb",
      ),
    ];
  }

  return [
    join(home, ".config/Cursor/User/globalStorage/state.vscdb"),
    join(home, ".config/cursor/User/globalStorage/state.vscdb"),
  ];
}

const normalize = (value) => {
  if (typeof value !== "string") return value;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "string" ? parsed : value;
  } catch {
    return value;
  }
};

function buildNotFoundError(platform, candidates) {
  if (platform === "darwin") {
    return `Cursor database not found in known macOS locations:\n${candidates.join("\n")}`;
  }

  return `Cursor database not found. Checked locations:\n${candidates.join("\n")}\n\nMake sure Cursor IDE is installed and opened at least once.`;
}

function buildOpenError(platform, error) {
  if (platform === "linux") {
    return "Cursor database not found. Make sure Cursor IDE is installed and you are logged in.";
  }

  return `Cursor database exists but could not open it: ${error.message}`;
}

function queryRows(db, sql, params = []) {
  return db.prepare(sql).all(...params) || [];
}

function pickValue(rows, keys, needles = []) {
  for (const key of keys) {
    const exact = rows.find((row) => row?.key === key);
    if (exact?.value != null) return normalize(exact.value);
  }

  for (const needle of needles) {
    const fuzzy = rows.find((row) => typeof row?.key === "string" && row.key.toLowerCase().includes(needle.toLowerCase()));
    if (fuzzy?.value != null) return normalize(fuzzy.value);
  }

  return null;
}

function findToken(db, exactKeys, fuzzyPatterns, fuzzyNeedles, platform) {
  const exactPlaceholders = exactKeys.map(() => "?").join(", ");
  const exactRows = queryRows(
    db,
    `SELECT key, value FROM itemTable WHERE key IN (${exactPlaceholders})`,
    exactKeys,
  );
  const exactValue = pickValue(exactRows, exactKeys);
  if (exactValue != null) return exactValue;

  if (platform !== "darwin") return null;

  const fuzzyClause = fuzzyPatterns.map(() => "key LIKE ?").join(" OR ");
  const fuzzyRows = queryRows(
    db,
    `SELECT key, value FROM itemTable WHERE ${fuzzyClause}`,
    fuzzyPatterns,
  );
  return pickValue(fuzzyRows, exactKeys, fuzzyNeedles);
}

/**
 * Extract tokens via better-sqlite3 (bundled dependency).
 * This is the preferred strategy — no external CLI required.
 */
async function extractTokensViaBetterSqlite(dbPath) {
  const { default: Database } = await import("better-sqlite3");
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });

  try {
    const accessToken = findToken(
      db,
      ACCESS_TOKEN_KEYS,
      ["%accessToken%", "%token%"],
      ["accessToken", "token"],
      process.platform,
    );
    const machineId = findToken(
      db,
      MACHINE_ID_KEYS,
      ["%machineId%", "%serviceMachineId%"],
      ["machineId", "serviceMachineId"],
      process.platform,
    );

    return { accessToken, machineId };
  } finally {
    db.close();
  }
}

/**
 * Extract tokens via sqlite3 CLI.
 * Fallback when better-sqlite3 native bindings are unavailable.
 */
async function extractTokensViaCLI(dbPath) {
  const normalize = (raw) => {
    const value = raw.trim();
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "string" ? parsed : value;
    } catch {
      return value;
    }
  };

  const query = async (sql) => {
    const { stdout } = await execFileAsync("sqlite3", [dbPath, sql], {
      timeout: 10000,
    });
    return stdout.trim();
  };

  // Try each key in priority order
  let accessToken = null;
  for (const key of ACCESS_TOKEN_KEYS) {
    try {
      const raw = await query(
        `SELECT value FROM itemTable WHERE key='${key}' LIMIT 1`,
      );
      if (raw) {
        accessToken = normalize(raw);
        break;
      }
    } catch {
      /* try next */
    }
  }

  let machineId = null;
  for (const key of MACHINE_ID_KEYS) {
    try {
      const raw = await query(
        `SELECT value FROM itemTable WHERE key='${key}' LIMIT 1`,
      );
      if (raw) {
        machineId = normalize(raw);
        break;
      }
    } catch {
      /* try next */
    }
  }

  return { accessToken, machineId };
}

/**
 * GET /api/oauth/cursor/auto-import
 * Auto-detect and extract Cursor tokens from local SQLite database.
 * Strategy: better-sqlite3 → sqlite3 CLI → manual fallback
 */
export async function GET() {
  try {
    const platform = process.platform;
    if (!SUPPORTED_PLATFORMS.has(platform)) {
      return NextResponse.json(
        { found: false, error: "Unsupported platform" },
        { status: 400 },
      );
    }

    const candidates = getCandidatePaths(platform);
    let dbPath = null;

    if (platform === "linux") {
      dbPath = candidates[0];
    } else {
      for (const candidate of candidates) {
        try {
          await access(candidate, constants.R_OK);
          dbPath = candidate;
          break;
        } catch {
          // Try next candidate
        }
      }

      if (!dbPath) {
        return NextResponse.json({
          found: false,
          error: buildNotFoundError(platform, candidates),
        });
      }
    }

    try {
      const tokens = await extractTokensViaBetterSqlite(dbPath);
      if (tokens.accessToken && tokens.machineId) {
        return NextResponse.json({
          found: true,
          accessToken: tokens.accessToken,
          machineId: tokens.machineId,
        });
      }
    } catch (error) {
      return NextResponse.json({
        found: false,
        error: buildOpenError(platform, error),
      });
    }

    try {
      const tokens = await extractTokensViaCLI(dbPath);
      if (tokens.accessToken && tokens.machineId) {
        return NextResponse.json({
          found: true,
          accessToken: tokens.accessToken,
          machineId: tokens.machineId,
        });
      }
    } catch {
      // sqlite3 CLI not available either
    }

    return NextResponse.json({
      found: false,
      error: "Please login to Cursor IDE first.",
    });
  } catch (error) {
    console.log("Cursor auto-import error:", error);
    return NextResponse.json(
      { found: false, error: error.message },
      { status: 500 },
    );
  }
}
