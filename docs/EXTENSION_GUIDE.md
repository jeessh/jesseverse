# Building a Jesseverse Extension

This document is for developers (i.e. future me) building a new service that should be connectable to the Jesseverse hub.

---

## What an extension is

An **extension** is any independently deployed backend that implements three HTTP endpoints. Once those endpoints exist and the extension is registered with the hub (`POST /api/extensions`), the hub's frontend will link to it and the MCP server will expose its actions to Claude/Cursor automatically.

The hub never imports your code. It only holds your URL and calls your two endpoints at runtime.

---

## Required endpoints

Your backend must implement exactly these three endpoints.

---

### `GET /info`

Returns core metadata about your extension. **Called automatically by the hub during registration** — your extension must implement this before you can register.

**Response:** `200 OK`, `Content-Type: application/json`

```json
{
  "title": "Expense Tracker",
  "description": "Track personal expenses by category",
  "version": "1.0.0",
  "author": "Jesse",
  "icon_url": "https://my-app.vercel.app/icon.png",
  "homepage_url": "https://my-app.vercel.app"
}
```

**Required fields:** `title`, `description`, `version`  
**Optional fields:** `author`, `icon_url`, `homepage_url`

Registration will fail with a `422` error if any required field is missing, or a `502` if `/info` is unreachable.

---

### `GET /capabilities`

Returns the list of actions your extension supports.

**Response:** `200 OK`, `Content-Type: application/json`

```json
[
  {
    "name": "add_expense",
    "description": "Record a new expense",
    "parameters": [
      {
        "name": "amount",
        "type": "number",
        "required": true,
        "description": "Amount spent in USD.",
        "example": "14.50"
      },
      {
        "name": "category",
        "type": "string",
        "required": false,
        "description": "Spending category.",
        "enum": ["food", "transport", "health", "entertainment", "other"]
      },
      {
        "name": "note",
        "type": "string",
        "required": false,
        "description": "Optional free-form note about the expense."
      }
    ]
  },
  {
    "name": "list_expenses",
    "description": "List recent expenses, optionally filtered by category",
    "parameters": [
      {
        "name": "category",
        "type": "string",
        "required": false,
        "description": "Filter to this category only.",
        "enum": ["food", "transport", "health", "entertainment", "other"]
      },
      {
        "name": "limit",
        "type": "number",
        "required": false,
        "description": "Max number of records to return. Defaults to 50."
      }
    ]
  }
]
```

**Rules:**
- Must return a JSON array (even if empty — though at least one action is expected).
- Each item must have `name` (string) and `description` (string).
- `parameters` is optional but recommended. Each parameter needs `name`, `type`, and `required`.
- `type` is a hint for the AI agent — use plain strings like `"string"`, `"number"`, `"boolean"`, `"object"`.
- `description` on each parameter tells the AI what the field means. **Always include this.**
- `enum` lists the only accepted values for a constrained string parameter. The AI uses this to pick valid inputs.
- `example` shows the expected format (e.g. `"2025-02-19"` for an ISO date). Shown to the AI when there is no `enum`.
- No authentication required on this endpoint — it's public metadata.

---

### `POST /execute`

Executes one of your actions.

**Request body:** `application/json`

```json
{
  "action": "add_expense",
  "parameters": {
    "amount": 14.50,
    "category": "food",
    "note": "lunch"
  }
}
```

**Response — success:** `200 OK`

```json
{
  "success": true,
  "data": { "id": "abc123", "amount": 14.50, "category": "food" }
}
```

**Response — failure:** `200 OK` (still 200 — use the `success` flag, not HTTP status)

```json
{
  "success": false,
  "error": "amount must be a positive number"
}
```

**Rules:**
- Always return `200`. Use `success: false` + `error` for expected failures. Reserve `4xx/5xx` for unexpected server errors only.
- `data` can be anything serialisable — an object, an array, a string.
- If `action` is not recognised, return `{ "success": false, "error": "Unknown action: <name>" }`.
- No authentication required (Jesseverse is a private personal hub — the assumption is only you are calling it).

---

## Optional: reminders

If your extension has items the user should be nudged to act on, you can opt in to the hub's `check_reminders` MCP tool by exposing two additional actions in `/execute`:

| Action | Description |
|---|---|
| `get_reminders` | Returns all records where a reminder is overdue. No parameters. |
| `snooze_reminder` | Pushes the reminder forward by 1 hour. Requires `id`. |

**How the hub uses these:**

When `check_reminders()` is called, the hub iterates every registered extension, checks its `/capabilities` for an action named `get_reminders`, and if found, calls `POST /execute` with `{ "action": "get_reminders", "parameters": {} }`. It collects the `data` arrays from all extensions and formats them into a single list for the agent.

**Required response shape for `get_reminders`:**

```json
{ "success": true, "data": [
  { "id": "<uuid>", "role": "<string>", "company": "<string>", "url": "<string or empty>" }
] }
```

The hub's output formatter reads exactly these four fields per record — `id`, `role`, `company`, `url`. `id` is required (it is passed back to `snooze_reminder` and any update action). `role`, `company`, and `url` are rendered in the agent's summary; missing fields display as `?`. If your domain uses different field names, update the formatting block inside `check_reminders()` in `backend/app/mcp/server.py` before registering.

**Required response shape for `snooze_reminder`:**

Accepts `{ "id": "<uuid>" }`. Should advance the record's `remind_at` timestamp by exactly 1 hour and return the updated record:

```json
{ "success": true, "data": { "id": "<uuid>", "remind_at": "<new ISO timestamp>" } }
```

**Filtering logic:** `get_reminders` should only return records where `remind_at <= now` (i.e. the reminder has come due). Records where `remind_at` is null or in the future must be excluded — otherwise the agent will surface them before they are actionable.

**Clearing a reminder:** Once the user acts on an item, the agent calls your extension's update action (e.g. a status update) to clear or nullify `remind_at`. There is no hub-level "clear" call — your `/execute` handler should set `remind_at = null` whenever the item is no longer in a pending state.

---

## CORS

Your backend must allow cross-origin requests from the hub backend and the hub frontend (served on different domains). Use a wildcard:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

Also handle `OPTIONS` preflight on `/capabilities` and `/execute` — return `204` with the same headers. In Next.js, set these both in `next.config.ts` `headers()` **and** in the route handler's `OPTIONS` export, because Next.js does not apply config-level headers to programmatic OPTIONS responses.

**FastAPI example:**

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Registering with the hub

Once your backend is deployed, you can **preview** it before committing — the hub will fetch your `/info` and `/capabilities` and show you a summary:

```bash
curl "https://jesseverse-backend.vercel.app/api/extensions/register?url=https://my-expense-tracker.vercel.app"
```

This is what the Jesseverse frontend uses when you paste a URL into the "Connect extension" field. It does **not** write anything to the registry — it's read-only.

To actually register, use the frontend confirmation step or curl:

```bash
curl -X POST https://jesseverse-backend.vercel.app/api/extensions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <API_KEY>" \
  -d '{
    "name": "expenses",
    "url": "https://my-expense-tracker.vercel.app"
  }'
```

The hub will call `GET <url>/info` automatically to populate the display metadata. No need to pass `description` — it comes from `/info`.

The `url` field must be the root of your backend (no trailing slash, no `/info` suffix). The hub appends `/info`, `/capabilities`, and `/execute` itself.

To remove: `DELETE /api/extensions/{name}` or click the trash icon on the card in the frontend.

---

## Minimal example (FastAPI)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten this in production
    allow_methods=["*"],
    allow_headers=["*"],
)

INFO = {
    "title": "Hello Extension",
    "description": "A minimal Jesseverse extension",
    "version": "1.0.0",
    "author": "Jesse",
}

CAPABILITIES = [
    {
        "name": "hello",
        "description": "Returns a greeting",
        "parameters": [
            {"name": "name", "type": "string", "required": False}
        ],
    }
]

class ExecuteRequest(BaseModel):
    action: str
    parameters: dict[str, Any] = {}

@app.get("/info")
def info():
    return INFO

@app.get("/capabilities")
def capabilities():
    return CAPABILITIES

@app.post("/execute")
def execute(req: ExecuteRequest):
    if req.action == "hello":
        name = req.parameters.get("name", "world")
        return {"success": True, "data": f"Hello, {name}!"}
    return {"success": False, "error": f"Unknown action: {req.action}"}
```

---

## Repo conventions (optional but recommended)

```
my-extension/
├── frontend/     # Extension UI — deployed separately, hub links here
└── backend/      # FastAPI (or any framework) implementing /capabilities + /execute
    ├── app/
    │   ├── main.py          # Mounts capabilities + execute routers
    │   └── capabilities.py  # The CAPABILITIES list — single source of truth
    └── supabase/
        └── migrations/      # Your own schema (e.g. "expenses")
```

Keep your `CAPABILITIES` list as a Python constant (or a JSON file). This lets your `/capabilities` endpoint stay trivially simple while the real logic lives in the `/execute` handler.

---

## Checklist before registering

- [ ] `GET /info` returns `{ title, description, version }` (plus optional `author`, `icon_url`, `homepage_url`)
- [ ] `GET /capabilities` returns a valid JSON array
- [ ] `POST /execute` accepts `{ action, parameters }` and returns `{ success, data? }` or `{ success: false, error }`  
- [ ] CORS is configured for the Jesseverse frontend origin
- [ ] Backend is deployed and publicly reachable
- [ ] Paste the URL in the Jesseverse frontend — it fetches `/info` and `/capabilities` to preview before you confirm
