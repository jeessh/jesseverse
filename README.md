# Jessiverse

A personal hub that connects all of my independently built tools and services into one place.

---

## What it is

Jessiverse is a central hub made up of two distinct concerns:

### This repo — The Hub

1. **Hub Frontend** — a launcher dashboard that lists every registered extension. Clicking one redirects to that extension's own independently deployed frontend.
2. **Hub Backend** — manages the extension registry, runs as an MCP server for AI agents (Claude, Cursor), and proxies tool calls out to registered extension backends.
3. **Supabase** — one Supabase project shared across all services, each with its own schema. The `jessiverse` schema owns the extension registry and agent tokens.

### Separate repos — Extensions

An **extension** is any service I build and register with the hub. Each extension is fully independent:
- **Extension Frontend** — deployed at its own URL. The hub links out to it; it is never embedded.
- **Extension Backend** — exposes two standard endpoints (see below). The hub calls these to discover and run its actions.
- **Extension Schema** — its own schema inside the shared Supabase project (e.g. `expenses`, `notes`).

The hub never imports or depends on extension code. It only holds a URL.

---

## Extension Protocol

Every extension backend must implement exactly two endpoints. This is the full contract between the hub and any extension.

```
GET  {extension_url}/capabilities
→ [{ name, description, parameters: [{ name, type, required }] }]

POST {extension_url}/execute
→ Body:     { action, parameters, agent }
→ Response: { success, data?, error? }
```

To register an extension: `POST /api/extensions` with its `name`, `url`, and optional `description`. Once registered, the hub automatically starts including that extension's capabilities in the MCP server and routing tool calls to it.

---

## Poke (AI Agent Integration)

Poke is Claude or Cursor connecting to Jessiverse via MCP (Model Context Protocol). Jessiverse runs as an MCP server, so any MCP-compatible AI client can connect with a single static bearer token (`MCP_TOKEN` in `.env`) and get access to tools across all registered extensions.

**MCP server URL:** `http://localhost:8000/mcp/mcp` (or the deployed equivalent)

**Tools the AI agent gets:**

| Tool | Description |
|---|---|
| `list_extensions()` | List all registered extensions and the actions each one supports |
| `use(extension, action, parameters)` | Execute any action on any registered extension |

**MCP client config (Claude Desktop):**
```json
{
  "mcpServers": {
    "jessiverse": {
      "url": "http://localhost:8000/mcp/mcp",
      "headers": { "Authorization": "Bearer <your MCP_TOKEN>" }
    }
  }
}
```

---

## Supabase Schema

One Supabase project. Each service gets its own schema to keep things isolated.

**`jessiverse` schema** (hub-owned tables):

```sql
-- Which extension backends are registered
extensions(id, name, url, description, registered_at)
```

Each extension owns its own schema in the same Supabase project. For example, an expense tracker extension would create and own an `expenses` schema — the hub never touches it.

---

## Repo Structure

This repo only. Extensions each live in their own separate repo.

```
jessiverse/                       ← this repo (the hub)
├── frontend/                     # Hub frontend: launcher dashboard
│   └── src/
│       ├── app/                  # Pages (dashboard, agent setup)
│       ├── extensions/           # Extension registry (name, icon, external URL)
│       └── components/
├── backend/                      # Hub backend: MCP server + extension registry API
│   └── app/
│       ├── agents/               # Token issuance + agent identity
│       ├── extensions/           # Extension registry: CRUD + HTTP proxy
│       └── mcp/                  # MCP server: aggregates capabilities across all extensions
│       └── core/
│           ├── config.py         # Settings (loaded from .env)
│           └── database.py       # Supabase client
└── supabase/
    └── migrations/               # Hub schema only (agents, tokens, extensions tables)
```

An extension repo (separate, independently deployed):
```
my-expense-tracker/               ← a separate repo (one extension)
├── frontend/                     # Extension frontend — hub links here, never embeds it
└── backend/                      # Extension backend — must implement the two-endpoint protocol
    └── supabase/
        └── migrations/           # Extension's own schema (e.g. "expenses")
```

---

## Running locally

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
# API docs: http://localhost:8000/api/docs
# MCP endpoint: http://localhost:8000/mcp/mcp
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

**Environment variables (backend `.env`):**
```
SUPABASE_URL=
SUPABASE_SECRET_KEY=
MCP_TOKEN=change-me-to-something-secret
SERVER_URL=http://localhost:8000
```

Copy `.env.example` in `backend/` as a starting point.
