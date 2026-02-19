# jesseverse

A personal hub that connects all of my independently built tools and services into one place.

---

## What it is

jesseverse is a central hub made up of two distinct concerns:

### This repo — The Hub

1. **Hub Frontend** — a launcher dashboard (Next.js) that lists every registered extension. Clicking one redirects to that extension's own independently deployed frontend.
2. **Hub Backend** — a FastAPI server that manages the extension registry, runs as an MCP server for AI agents (Claude, Cursor), and proxies tool calls out to registered extension backends.
3. **Supabase** — one Supabase project shared across all services, each with its own schema. The `jesseverse` schema owns the extension registry.

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
→ Body:     { action, parameters }
→ Response: { success, data?, error? }
```

To register an extension: `POST /api/extensions` with `{ name, url, description }`. Once registered, the hub automatically includes that extension's capabilities in the MCP server and routes tool calls to it.

---

## Poke (AI Agent Integration)

Poke is Claude or Cursor connecting to jesseverse via MCP (Model Context Protocol). jesseverse runs a FastMCP server so any MCP-compatible AI client can connect using a single static bearer token (`MCP_TOKEN` in `.env`) and get live access to tools across all registered extensions.

**MCP server URL:** `https://jesseverse-backend.vercel.app/mcp` (or `http://localhost:8000/mcp` locally)

**Tools the AI agent gets:**

| Tool | Description |
|---|---|
| `list_extensions()` | List all registered extensions and the actions each one supports |
| `use(extension, action, parameters)` | Execute any action on any registered extension |

`list_extensions` calls `GET /capabilities` on every registered extension in real time and returns a combined summary. `use` calls `POST /execute` on the targeted extension and returns its response.

**MCP client config (Claude Desktop / Cursor):**
```json
{
  "mcpServers": {
    "jesseverse": {
      "url": "https://jesseverse-backend.vercel.app/mcp",
      "headers": { "Authorization": "Bearer <your MCP_TOKEN>" }
    }
  }
}
```

---

## Supabase Schema

One Supabase project. Each service gets its own schema to keep things isolated.

**`jesseverse` schema** (hub-owned, migration at `supabase/migrations/001_extensions.sql`):

```sql
extensions(id uuid PK, name text UNIQUE, url text, description text, registered_at timestamptz)
```

Each extension owns its own schema in the same Supabase project (e.g. `expenses`, `notes`). The hub never touches extension schemas.

---

## Repo Structure

This repo only. Extensions each live in their own separate repo.

```
jesseverse/                         ← this repo (the hub)
├── frontend/                       # Hub frontend: Next.js 15 launcher dashboard
│   ├── app/                        # App Router: layout, page (dashboard)
│   ├── components/
│   │   └── ExtensionCard.tsx       # Card that links out to an extension
│   ├── lib/
│   │   └── extensions.ts           # Extension type + getExtensions() API call
│   └── .env.local.example
├── backend/                        # Hub backend: FastAPI + FastMCP
│   └── app/
│       ├── core/
│       │   ├── config.py           # Settings via pydantic-settings (loaded from .env)
│       │   └── database.py         # Supabase client singleton
│       ├── extensions/
│       │   ├── router.py           # REST API: GET/POST /api/extensions, DELETE /api/extensions/{name}
│       │   └── service.py          # CRUD against Supabase + HTTP proxy to extension backends
│       ├── mcp/
│       │   └── server.py           # FastMCP server: StaticTokenVerifier + list_extensions/use tools
│       └── main.py                 # FastAPI app: mounts extensions router + MCP ASGI app
│   ├── requirements.txt
│   └── .env.example
└── supabase/
    └── migrations/
        └── 001_extensions.sql      # Creates the extensions table
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

**1. Supabase migration**

Run `supabase/migrations/001_extensions.sql` in the Supabase SQL editor to create the `extensions` table.

**2. Backend:**
```bash
cd backend
cp .env.example .env      # fill in SUPABASE_URL, SUPABASE_SECRET_KEY, MCP_TOKEN
pip install -r requirements.txt
uvicorn app.main:app --reload
# REST API docs: http://localhost:8000/api/docs
# MCP endpoint:  http://localhost:8000/mcp/mcp
```

**3. Frontend:**
```bash
cd frontend
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
# http://localhost:3000
```

**Environment variables — backend `backend/.env`:**
```
SUPABASE_URL=
SUPABASE_SECRET_KEY=        # use the new "secret" key format from Supabase dashboard
MCP_TOKEN=change-me-to-something-secret
SERVER_URL=https://jesseverse-backend.vercel.app
CORS_ORIGINS=http://localhost:3000,https://jesseverse.vercel.app
```

**Environment variables — frontend `frontend/.env.local`:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Extension registry API

```
GET    /api/extensions           → list all registered extensions
POST   /api/extensions           → register a new extension  { name, url, description }
DELETE /api/extensions/{name}    → remove an extension
```

Example — register your first extension:
```bash
curl -X POST http://localhost:8000/api/extensions \
  -H "Content-Type: application/json" \
  -d '{"name": "expenses", "url": "https://my-expense-tracker.vercel.app", "description": "Track expenses"}'
```

---

## Tech stack

| Layer | Tech |
|---|---|
| Hub frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, React 19 |
| Hub backend | FastAPI, Python, pydantic-settings |
| MCP server | FastMCP (stateless HTTP, static bearer token auth) |
| Extension proxy | httpx (async HTTP calls to extension backends) |
| Database | Supabase (PostgreSQL), supabase-python client |
