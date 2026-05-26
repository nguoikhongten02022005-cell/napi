# Docker

Run Napi in a container. Published image: [`decolua/napi`](https://hub.docker.com/r/decolua/napi) — multi-platform `linux/amd64` + `linux/arm64`.

---

# 👤 For Users

## Quick start

```bash
docker run -d \
  -p 20000:20000 \
  -v "$HOME/.napi:/app/data" \
  -e DATA_DIR=/app/data \
  --name napi \
  decolua/napi:latest
```

App listens on port `20000`. Open: http://localhost:20000

## Manage container

```bash
docker logs -f napi        # view logs
docker stop napi           # stop
docker start napi          # start again
docker rm -f napi          # remove
```

## Data persistence

```bash
-v "$HOME/.napi:/app/data" \
-e DATA_DIR=/app/data
```

Without `DATA_DIR`, the app falls back to `~/.napi/` (macOS/Linux) or `%APPDATA%\napi\` (Windows). In the container, `DATA_DIR=/app/data` makes the bind mount work.

Data layout under `$DATA_DIR/`:

```text
$DATA_DIR/
├── db/
│   ├── data.sqlite       # main SQLite database
│   └── backups/          # auto backups
└── ...                   # certs, logs, runtime configs
```

Host path: `$HOME/.napi/db/data.sqlite`
Container path: `/app/data/db/data.sqlite`

## Optional env vars

```bash
docker run -d \
  -p 20000:20000 \
  -v "$HOME/.napi:/app/data" \
  -e DATA_DIR=/app/data \
  -e PORT=20000 \
  -e HOSTNAME=0.0.0.0 \
  -e DEBUG=true \
  --name napi \
  decolua/napi:latest
```

## Update to latest

```bash
docker pull decolua/napi:latest
docker rm -f napi
# re-run the quick start command
```

---

# 🛠 For Developers

## Build image locally (test)

```bash
cd app && docker build -t napi .

docker run --rm -p 20000:20000 \
  -v "$HOME/.napi:/app/data" \
  -e DATA_DIR=/app/data \
  napi
```

## Publish (automatic via CI)

Push a git tag `v*` → GitHub Actions builds multi-platform (amd64+arm64) and pushes to:
- `ghcr.io/decolua/napi:v{version}` + `:latest`
- `decolua/napi:v{version}` + `:latest`

```bash
# Use scripts/release.js (recommended)
node scripts/release.js "Release title" "Notes"

# Or manually
git tag v0.4.x && git push origin v0.4.x
```

Workflow: `app/.github/workflows/docker-publish.yml`
