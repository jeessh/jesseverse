# jesseverse

My personal hub. Every app I build plugs into this and immediately shows up on the dashboard and inside Claude/Cursor via MCP — no config changes needed.

---

## How it works

Every app I build is an extension. Each one just needs two endpoints:

```
GET  /capabilities  →  list of actions it can do
POST /execute       →  run one of those actions
```

Register an extension with its URL and it's live instantly — on the dashboard and in the MCP server. The hub doesn't care what an extension does, it just knows how to talk to it.

## Structure

- `frontend/` — dashboard that lists all extensions and links out to them
- `backend/` — FastAPI server that manages the registry, proxies tool calls, and runs the MCP server
- `supabase/` — hub owns the `jesseverse` schema; each extension manages its own

Each extension is its own separate repo with its own frontend, backend, and DB schema.

## MCP

Connect any MCP client (Claude Desktop, Cursor, etc.) and get live access to every extension's tools automatically.

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

| Tool | What it does |
|---|---|
| `list_extensions` | Polls every extension and returns what they can do |
| `use` | Runs any action on any extension |

## Running locally

```bash
# Backend
cd backend
cp .env.example .env  # SUPABASE_URL, SUPABASE_SECRET_KEY, MCP_TOKEN
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
cp .env.local.example .env.local  # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install && npm run dev
```

## Stack

| | |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind |
| Backend | FastAPI, Python |
| MCP | FastMCP |
| Database | Supabase |
