# Installation

Detailed installation guide for Napi with troubleshooting tips.

---

## Requirements

### System Requirements

- **Node.js**: Version 20.0.0 or higher
- **npm**: Version 10.0.0 or higher (comes with Node.js)
- **OS**: macOS, Linux, Windows (WSL recommended)
- **Disk Space**: ~200MB for installation

### Check Your Version

```bash
node --version
# Should show v20.x.x or higher

npm --version
# Should show 10.x.x or higher
```

**Don't have Node.js?** Install from [nodejs.org](https://nodejs.org/)

---

## Installation Methods

### Method 1: Global Installation (Recommended)

Install Napi globally to use from anywhere:

```bash
npm install -g napi
```

**Start Napi:**

```bash
napi
```

**Benefits:**
- ✅ Run from any directory
- ✅ Simple command: `napi`
- ✅ Auto-updates with `npm update -g napi`

### Method 2: Local Installation

Install in a specific project:

```bash
mkdir my-napi
cd my-napi
npm install napi
```

**Start Napi:**

```bash
npx napi
```

**Benefits:**
- ✅ Isolated per project
- ✅ Version control per project
- ✅ No global namespace pollution

### Method 3: From Source (Development)

Clone and build from GitHub:

```bash
git clone https://github.com/decolua/napi.git
cd napi/app
npm install
npm run build
npm start
```

**Benefits:**
- ✅ Latest development features
- ✅ Contribute to development
- ✅ Custom modifications

---

## First Run

### Start the Server

```bash
napi
```

**What happens:**
1. Server starts on `http://localhost:20000`
2. Dashboard opens automatically in browser
3. Data directory created at `~/.napi`
4. API key generated automatically

### Dashboard Login

**Default credentials:**
- Password: `123456`

**⚠️ Change password immediately:**
1. Login to dashboard
2. Settings → Change Password
3. Use strong password

### Get Your API Key

```
Dashboard → Settings → API Keys
→ Copy your API key
→ Use in CLI tools
```

**Example API key format:**
```
9r_1234567890abcdef1234567890abcdef
```

---

## Verify Installation

### Check Server Status

```bash
curl http://localhost:20000/health
```

**Expected response:**
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

### List Available Models

```bash
curl http://localhost:20000/v1/models \
  -H "Authorization: Bearer your-api-key"
```

**Expected response:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "cc/claude-opus-4-5-20251101",
      "object": "model",
      "created": 1234567890,
      "owned_by": "claude-code"
    }
  ]
}
```

### Test Chat Completion

```bash
curl http://localhost:20000/v1/chat/completions \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "cc/claude-opus-4-5-20251101",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

---

## Configuration

### Environment Variables

Create `.env` file or set environment variables:

```bash
# Security (REQUIRED in production)
export JWT_SECRET="your-secure-secret-change-this"
export INITIAL_PASSWORD="your-password"

# Storage
export DATA_DIR="~/.napi"

# Server
export PORT="20000"
export NODE_ENV="production"

# Logging
export ENABLE_REQUEST_LOGS="false"
```

### Data Directory

**Default location:** `~/.napi`

**Contents:**
```
~/.napi/
  ├── db.json           # Database (providers, combos, usage)
  ├── api-keys.json     # API keys
  └── logs/             # Request logs (if enabled)
```

**Change location:**

```bash
export DATA_DIR="/custom/path"
napi
```

### Port Configuration

**Default port:** `20000`

**Change port:**

```bash
export PORT="3000"
napi
```

**Or use command line:**

```bash
napi --port 3000
```

---

## Troubleshooting

### Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::20000
```

**Solution 1: Kill existing process**

```bash
# Find process using port 20000
lsof -i :20000

# Kill process
kill -9 <PID>
```

**Solution 2: Use different port**

```bash
napi --port 3000
```

### Permission Denied

**Error:**
```
Error: EACCES: permission denied, mkdir '/usr/local/lib/node_modules/napi'
```

**Solution: Use sudo (not recommended) or fix npm permissions**

```bash
# Fix npm permissions (recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Then install again
npm install -g napi
```

### Node.js Version Too Old

**Error:**
```
Error: The engine "node" is incompatible with this module
```

**Solution: Update Node.js**

```bash
# Using nvm (recommended)
nvm install 20
nvm use 20

# Or download from nodejs.org
```

### Dashboard Not Opening

**Issue:** Dashboard doesn't open automatically

**Solution 1: Open manually**

```
http://localhost:20000
```

**Solution 2: Check firewall**

```bash
# macOS: Allow Node.js in System Preferences → Security
# Linux: Check iptables
# Windows: Check Windows Firewall
```

### Cannot Connect to Providers

**Issue:** OAuth login fails or API key invalid

**Solution 1: Check internet connection**

```bash
ping google.com
```

**Solution 2: Check provider status**

- Claude Code: [status.anthropic.com](https://status.anthropic.com)
- OpenAI: [status.openai.com](https://status.openai.com)
- Gemini: [status.cloud.google.com](https://status.cloud.google.com)

**Solution 3: Regenerate API key**

```
Dashboard → Provider → Disconnect → Reconnect
```

### High Memory Usage

**Issue:** Napi using too much RAM

**Solution: Restart server**

```bash
# Stop
pkill -f napi

# Start
napi
```

**Or use PM2 for auto-restart:**

```bash
npm install -g pm2
pm2 start napi --name napi
pm2 save
```

---

## Deployment Options

### Local Development

```bash
npm install -g napi
napi
```

**Use case:** Personal coding, testing

### VPS/Cloud Server

```bash
# Install
npm install -g napi

# Configure
export JWT_SECRET="your-secure-secret"
export INITIAL_PASSWORD="your-password"
export NODE_ENV="production"

# Start with PM2
npm install -g pm2
pm2 start napi --name napi
pm2 save
pm2 startup
```

**Use case:** Team access, remote coding

### Docker

```bash
docker pull napi/napi:latest

docker run -d \
  -p 20000:20000 \
  -e JWT_SECRET="your-secure-secret" \
  -e INITIAL_PASSWORD="your-password" \
  -v napi-data:/root/.napi \
  --name napi \
  napi/napi:latest
```

**Use case:** Containerized deployment, Kubernetes

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:20000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        
        # SSE support for streaming
        proxy_buffering off;
        proxy_read_timeout 86400;
    }
}
```

**Use case:** HTTPS, custom domain, load balancing

---

## Uninstallation

### Remove Global Installation

```bash
npm uninstall -g napi
```

### Remove Data Directory

```bash
rm -rf ~/.napi
```

### Remove Configuration

```bash
# Remove environment variables from shell config
nano ~/.bashrc  # or ~/.zshrc
# Delete napi-related exports
```

---

## Next Steps

- [Getting Started Guide](../getting-started.md) - Connect providers and start coding
- [Features](../features/) - Explore quota tracking, combos, deployment
- [Troubleshooting](../troubleshooting.md) - Fix common issues

---

## Need Help?

- **Website**: [napi.com](https://napi.com)
- **GitHub**: [github.com/decolua/napi](https://github.com/decolua/napi)
- **Issues**: [github.com/decolua/napi/issues](https://github.com/decolua/napi/issues)
