# 🦫 Beaver Bridge

A unified **MCP (Model Context Protocol) Gateway** that consolidates multiple MCP servers into a single platform. Designed as a foundation for **AI agents** to seamlessly access and orchestrate diverse data sources and tools.

## Vision

Beaver Bridge is a **context platform for agents**. Instead of agents juggling multiple MCP connections, they talk to a single gateway that handles authentication, routing, orchestration, and observability. This allows agents to focus on reasoning, not infrastructure.

---

## Core Features

### 1. **Unified Server Management**
- Register and manage multiple MCP servers (Google Cloud, Databricks, custom, etc.)
- YAML-based configuration
- Hot-add/remove servers without restart

### 2. **Enterprise Authentication**
- **Multiple auth types**: Google Access Token, Google ID Token, Bearer Token, None
- **API Key validation** for client access
- **Audit logs** for security tracking

### 3. **Interactive Tools**
- **Tool Explorer**: Browse all available MCP tools and resources
- **Playground**: Test MCP tools in real-time
- **Resource viewer**: Preview MCP resources

### 4. **Observability**
- Real-time server health status
- API metrics (latency, success rate, errors)
- Rate limiting with SlowAPI

---

## Architecture

![Architecture Overview](image/README/1776507845639.png)

### Backend — FastAPI

```
app/
├── main.py              # App factory, lifespan, router registration
├── config.py            # Settings via pydantic-settings (.env)
├── metrics.py           # In-memory call/latency/error store
├── status_cache.py      # Background ping cache (refreshes every 60s)
├── limiter.py           # slowapi Limiter (per-API-key rate limiting)
├── audit.py             # Structured audit logs (JSON format output)
│
├── registry/
│   ├── models.py        # MCPServerConfig, MCPRegistry (Pydantic v2)
│   └── loader.py        # Loads config/mcp_servers.yaml at startup
│
├── mcp/
│   ├── client.py        # MCPClient — SSE / Streamable HTTP transport
│   └── pool.py          # MCPClientPool — name lookup, 404/503 handling
│
├── middleware/
│   └── auth.py          # X-API-Key header validation (constant-time compare)
│
├── routers/
│   ├── health.py        # GET /health  (no auth, for liveness probes)
│   ├── mcps.py          # All /api/v1/mcps/* endpoints
│   └── metrics.py       # GET /api/v1/metrics/*
│
└── schemas/
    └── responses.py     # Pydantic response models
```

#### Key design decisions

| Decision | Reason |
|----------|--------|
| Per-call MCP sessions (not persistent) | Stateless → Cloud Run friendly, no connection leak |
| Status cache + background refresh | `GET /mcps` returns instantly; live ping is opt-in (`?live=true`) |
| In-memory metrics | Zero dependencies; swap for Prometheus later if needed |
| ADC access token for Google APIs | Works locally (gcloud ADC) and on GCP (Workload Identity) |

#### Pages

| Page | Description |
|------|-------------|
| **Overview** | Stat cards (total/reachable/errors), MCP status grid, tag categories |
| **MCP Registry** | Left filter panel by Provider / Tag / Status; cards grouped by provider |
| **Tool Explorer** | Select MCP → browse tools; expand to see input schema; one-click to Playground |
| **Playground** | Select MCP + tool, JSON arg editor, run & see response, call history |
| **Observability** | Leaderboard with usage bars, latency, error rate; drill into per-tool stats |

---

## API Endpoints

```
GET  /health                                   No auth — liveness probe

GET  /api/v1/mcps                              List all MCPs (from cache, instant)
GET  /api/v1/mcps?live=true                    List all MCPs with real-time ping

GET  /api/v1/mcps/{name}/tools                 List tools
GET  /api/v1/mcps/{name}/resources             List resources
GET  /api/v1/mcps/{name}/prompts               List prompts
POST /api/v1/mcps/{name}/tools/{tool}/call     Invoke a tool

GET  /api/v1/metrics                           Usage summary (all MCPs)
GET  /api/v1/metrics/{name}                    Per-MCP tool breakdown
```

All endpoints except `/health` require `X-API-Key: <key>` header.

---

## MCP Registry Config

All MCP servers are declared in `config/mcp_servers.yaml`:

```yaml
servers:
  - name: bigquery                          # used in API paths
    display_name: "BigQuery"
    description: "BigQuery MCP server"
    url: "https://bigquery.googleapis.com/mcp"
    transport: streamable_http              # sse | streamable_http
    auth:
      type: google_access_token             # google_access_token | google_id_token | bearer | none
    provider: "Google Cloud"               # shown in UI filter
    gcp_project: ai-production-487311      # x-goog-user-project header
    enabled: true
    tags: ["gcp", "data", "sql"]
```

To add a new MCP server: add an entry and restart the backend.

---

## Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- `gcloud auth application-default login` (for Google Cloud MCPs)

### Backend

```bash
# Install
python -m venv .venv
.venv/bin/pip install -e ".[dev]"

# Configure
cp .env.example .env
# Edit .env: set API_KEYS=your-secret-key

# Run
.venv/bin/uvicorn app.main:app --reload --port 8089
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Swagger UI

```
http://localhost:8089/docs
```

---

## Rate Limiting

Each API Key tracks call frequency independently, default is **60 calls / minute** (adjustable via `.env`).

```env
RATE_LIMIT_TOOL_CALL=60/minute   # 60 times per minute
# RATE_LIMIT_TOOL_CALL=10/second  # 10 times per second
# RATE_LIMIT_TOOL_CALL=1000/hour  # 1000 times per hour
```

Returns when limit is exceeded:

```json
HTTP 429 Too Many Requests
{"error": "Rate limit exceeded: 60 per 1 minute"}
```

- Implementation: [slowapi](https://github.com/laurentS/slowapi), in-memory counting (no Redis required)
- Only limits `POST /api/v1/mcps/{name}/tools/{tool}/call` (read-only endpoints are not rate-limited)
- Key function is based on `X-API-Key`, ensuring different keys do not affect each other

---

## Audit Log

Every tool call and authentication failure will output a line of JSON to stderr, separated by the `beaver_bridge.audit` logger:

### tool_call event

```json
{
  "event": "tool_call",
  "ts": "2026-04-07T12:34:56.789012+00:00",
  "api_key": "****ab12",
  "mcp": "bigquery",
  "tool": "execute_query",
  "latency_ms": 312.5,
  "is_error": false,
  "status": 200
}
```

### auth_failure event

```json
{
  "event": "auth_failure",
  "ts": "2026-04-07T12:34:56.789012+00:00",
  "api_key": "—",
  "path": "/api/v1/mcps/bigquery/tools",
  "reason": "missing_key",
  "status": 401
}
```

| Field | Description |
|------|------|
| `api_key` | Masks the last 4 characters (`****ab12`), shows `—` when no key is present |
| `reason` | `missing_key` (no key provided) or `invalid_key` (invalid key) |
| `is_error` | Tool-level error returned by the MCP server (HTTP 200 but the tool itself failed) |
| `status` | HTTP status code (200 / 401 / 403 / 502 / 504) |

---

## Why Beaver Bridge?

![Beaver Bridge Benefits](image/README/1776508210592.png)

**Benefits:**
- **Agents focus on reasoning**, not infrastructure
- **Unified authentication** and access control
- **Single observability point** for all tool usage
- **Easier to scale** and maintain your MCP ecosystem
- **Foundation** for more advanced agent features

---

## Project Structure (full)

```
poc-beaver-bridge/
├── app/                    # FastAPI backend
├── config/
│   └── mcp_servers.yaml   # MCP server registry
├── frontend/               # React + Vite UI
├── tests/                  # pytest test suite
├── .env.example
├── Dockerfile
├── pyproject.toml
├── test_api.py             # Quick Python API test script
└── test_curl.sh            # curl one-liners for manual testing
```
