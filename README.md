# napi

Local AI API router with OpenAI-compatible endpoint and web dashboard.

## Install

### From npm

```bash
npm install -g napi
```

### From GitHub

```bash
npm install -g github:nguoikhongten02022005-cell/napi
```

## Quick start

```bash
napi
```

Server starts at **http://localhost:20000**.

- Dashboard → http://localhost:20000/dashboard
- API → http://localhost:20000/v1

### Options

```bash
napi --host 0.0.0.0 --port 20000
napi --version
napi --help
```

## Features

- OpenAI-compatible API (`/v1/chat/completions`, `/v1/models`, `/v1/embeddings`, etc.)
- Web dashboard for managing providers, API keys, and usage
- Multi-provider routing with failover
- Proxy pool support
- MITM proxy for API inspection
- System tray mode (desktop)
- Headless Linux / Termux compatible

## Build from source

```bash
git clone https://github.com/nguoikhongten02022005-cell/napi.git
cd napi
cd cli
npm run pack:cli
npm install -g /tmp/napi-*.tgz
napi
```

## License

MIT
