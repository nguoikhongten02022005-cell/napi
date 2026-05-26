#!/usr/bin/env bash
set -e

# Napi - Build & Install Script
# Usage: bash scripts/install.sh
# After install: run `napi` to start the server

echo "==> Checking prerequisites..."

if ! command -v node &>/dev/null; then
  echo "❌ Node.js is required. Install it from https://nodejs.org"
  exit 1
fi

if ! command -v npm &>/dev/null; then
  echo "❌ npm is required. Install it from https://nodejs.org"
  exit 1
fi

echo "   Node: $(node -v)"
echo "   npm:  $(npm -v)"

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLI_DIR="$SCRIPT_DIR/cli"

echo ""
echo "==> Installing dependencies..."
cd "$SCRIPT_DIR"
npm install --ignore-scripts 2>&1 | tail -1

cd "$CLI_DIR"
npm install 2>&1 | tail -1

echo ""
echo "==> Building CLI package..."
npm run build

echo ""
echo "==> Creating tarball..."
npm pack --ignore-scripts --pack-destination /tmp 2>&1

TARBALL="napi-$(node -p "require('./package.json').version").tgz"

echo ""
echo "==> Installing globally..."
npm install -g "/tmp/$TARBALL"

echo ""
echo "============================================"
echo "  Napi CLI installed successfully!"
echo "============================================"
echo ""
echo "Commands:"
echo "  napi                  Start server (default http://localhost:20000)"
echo "  napi --version        Show version"
echo "  napi --help           Show help"
echo ""
echo "Endpoints:"
echo "  Dashboard:  http://localhost:20000/dashboard"
echo "  API:        http://localhost:20000/v1"
echo ""
echo "Quick start:"
echo "  napi --host 0.0.0.0 --port 20000"
echo ""
