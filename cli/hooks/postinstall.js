#!/usr/bin/env node

// Postinstall: warm-up SQLite deps into ~/.napi/runtime so the first
// `napi` start doesn't need network. Failure here is non-fatal —
// cli.js will retry at runtime if anything is missing.
const { ensureSqliteRuntime } = require("./sqliteRuntime");
const { ensureTrayRuntime } = require("./trayRuntime");

try {
  const sqlite = ensureSqliteRuntime({ silent: false });
  console.log(sqlite.skipped ? "[napi] runtime SQLite warm-up skipped" : "[napi] runtime SQLite deps ready");
} catch (e) {
  console.warn(`[napi] runtime warm-up skipped: ${e.message}`);
}

try {
  const tray = ensureTrayRuntime({ silent: false });
  if (tray.skipped) {
    console.log("[napi] tray warm-up skipped");
  }
} catch (e) {
  console.warn(`[napi] tray runtime skipped: ${e.message}`);
}

process.exit(0);
