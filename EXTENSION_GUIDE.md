# Building a Jesseverse Extension

This document is for developers (i.e. future me) building a new service that should be connectable to the Jesseverse hub.

---

## What an extension is

An **extension** is any independently deployed backend that implements two HTTP endpoints. Once those endpoints exist and the extension is registered with the hub (`POST /api/extensions`), the hub's frontend will link to it and the MCP server will expose its actions to Claude/Cursor automatically.

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
      { "name": "amount", "type": "number", "required": true },
      { "name": "category", "type": "string", "required": false },
      { "name": "note", "type": "string", "required": false }
    ]
  },
  {
    "name": "list_expenses",
    "description": "List recent expenses",
    "parameters": [
      { "name": "limit", "type": "number", "required": false }
    ]
  }
]
```

**Rules:**
- Must return a JSON array (even if empty — though at least one action is expected).
- Each item must have `name` (string) and `description` (string).
- `parameters` is optional but recommended. Each parameter needs `name`, `type`, and optionally `required`.
- `type` is a hint for the AI agent — use plain strings like `"string"`, `"number"`, `"boolean"`, `"object"`.
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

## CORS

Your backend must allow requests from the Jesseverse frontend origin. At minimum:

```
Access-Control-Allow-Origin: https://jesseverse.vercel.app
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

For local development, also allow `http://localhost:3000`.

**FastAPI example:**

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://jesseverse.vercel.app", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Registering with the hub

Once your backend is deployed, register it from the Jesseverse frontend (paste the URL in the "Connect extension" field) or via curl:

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
- [ ] Paste the URL in the Jesseverse frontend — it probes `/capabilities` before registering, so you'll see the actions immediately
