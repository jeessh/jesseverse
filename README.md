# jesseverse

My personal platform. A hub that dynamically discovers and orchestrates any tool I build, and exposes all of them to AI agents via MCP — with zero config changes required when I add something new.

---

## The idea

Every app I build is an **extension**: an independently deployed frontend + backend that plugs into jesseverse by implementing a two-endpoint protocol. The hub doesn't know or care what an extension does. It just calls `/capabilities` to learn what it can do, and `/execute` to do it.

This means I can ship a new tool, register its URL, and immediately:
- See it appear on the hub dashboard
- Use it from Claude or Cursor via MCP

No shared code, no monorepo coupling. Just a URL.

---

## Architecture

**This repo — the hub:**

- `frontend/` — Next.js dashboard that lists all registered extensions and links out to them
- `backend/` — FastAPI server that owns the extension registry, proxies tool calls, and runs a FastMCP server for AI access
- `supabase/` — one shared Supabase project; the hub owns the `jesseverse` schema, each extension owns its own

**Extensions (separate repos):**

Each extension is fully self-contained — its own frontend, backend, and DB schema. The hub only holds a URL.

---

## Extension protocol

Two endpoints. That's the entire contract.

```
GET  /capabilities  →  [{ name, description, parameters }]
POST /execute       →  { action, parameters }  →  { success, data?, error? }
```

Register an extension with `POST /api/extensions { name, url, description }` and it's live instantly — on the dashboard and inside the MCP server.

---

## AI / MCP integration

jesseverse runs a FastMCP server, so any MCP-compatible client (Claude Desktop, Cursor, etc.) can connect and get real-time access to tools across every registered extension.

```json
{
  "mcpServers": {
    "jesseverse": {
      "url": "https://jesseverse-backend.vercel.app/mcp",
      "headers": { "Authorization": "Bearer <MCP_TOKEN>" }
    }
  }
}
```

Two tools are exposed:

| Tool | What it does |
|---|---|
| `list_extensions()` | Polls every extension's `/capabilities` and returns a live summary |
| `use(extension, action, parameters)` | Routes a call to any extension's `/execute` |

---

## Running locally

```bash
# 1. Apply the hub migration in your Supabase SQL editor
#    supabase/migrations/001_extensions.sql

# 2. Backend
cd backend
cp .env.example .env   # SUPABASE_URL, SUPABASE_SECRET_KEY, MCP_TOKEN
pip install -r requirements.txt
uvicorn app.main:app --reload

# 3. Frontend
cd frontend
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install && npm run dev
```

---

## Stack

| | |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python |
| AI/MCP | FastMCP (stateless HTTP, bearer token auth) |
| Database | Supabase (PostgreSQL) |
