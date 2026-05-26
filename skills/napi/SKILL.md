---
name: napi
description: Entry point for Napi — local/remote AI gateway with OpenAI-compatible REST for chat, image, TTS, embeddings, web search, web fetch. Use when the user mentions Napi, NAPI_URL, or wants AI without writing provider boilerplate. This skill covers setup + indexes capability skills; fetch the relevant capability SKILL.md from the URLs below when needed.
---

# Napi

Local/remote AI gateway exposing OpenAI-compatible REST. One key, many providers, auto-fallback.

## Setup

```bash
export NAPI_URL="http://localhost:20000"      # or VPS / tunnel URL
export NAPI_KEY="sk-..."                      # from Dashboard → Keys (only if requireApiKey=true)
```

All requests: `${NAPI_URL}/v1/...` with header `Authorization: Bearer ${NAPI_KEY}` (omit if auth disabled).

Verify: `curl $NAPI_URL/api/health` → `{"ok":true}`

## Discover models

```bash
curl $NAPI_URL/v1/models                  # chat/LLM (default)
curl $NAPI_URL/v1/models/image            # image-gen
curl $NAPI_URL/v1/models/tts              # text-to-speech
curl $NAPI_URL/v1/models/embedding        # embeddings
curl $NAPI_URL/v1/models/web              # web search + fetch (entries have `kind` field)
curl $NAPI_URL/v1/models/stt              # speech-to-text
curl $NAPI_URL/v1/models/image-to-text    # vision
```

Use `data[].id` as `model` field in requests. Combos appear with `owned_by:"combo"`.

Response shape:
```json
{ "object": "list", "data": [
  { "id": "openai/gpt-5", "object": "model", "owned_by": "openai", "created": 1735000000 },
  { "id": "tavily/search", "object": "model", "kind": "webSearch", "owned_by": "tavily", "created": 1735000000 }
]}
```

## Capability skills

When the user needs a specific capability, fetch that skill's `SKILL.md` from its raw URL:

| Capability | Raw URL |
|---|---|
| Chat / code-gen | https://raw.githubusercontent.com/decolua/napi/refs/heads/master/skills/napi-chat/SKILL.md |
| Image generation | https://raw.githubusercontent.com/decolua/napi/refs/heads/master/skills/napi-image/SKILL.md |
| Text-to-speech | https://raw.githubusercontent.com/decolua/napi/refs/heads/master/skills/napi-tts/SKILL.md |
| Speech-to-text | https://raw.githubusercontent.com/decolua/napi/refs/heads/master/skills/napi-stt/SKILL.md |
| Embeddings | https://raw.githubusercontent.com/decolua/napi/refs/heads/master/skills/napi-embeddings/SKILL.md |
| Web search | https://raw.githubusercontent.com/decolua/napi/refs/heads/master/skills/napi-web-search/SKILL.md |
| Web fetch (URL → markdown) | https://raw.githubusercontent.com/decolua/napi/refs/heads/master/skills/napi-web-fetch/SKILL.md |

## Errors

- 401 → set/refresh `NAPI_KEY` (Dashboard → Keys)
- 400 `Invalid model format` → check `model` exists in `/v1/models/<kind>`
- 503 `All accounts unavailable` → wait `retry-after` or add another provider account
