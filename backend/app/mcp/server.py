"""
Jesseverse MCP server.

Exposes two tools to any MCP-compatible AI client (Claude Desktop, Cursor, etc.):

  list_extensions()
      Returns every registered extension and the actions it supports.
      Calls GET {url}/capabilities on each extension in real time.

  use(extension, action, parameters)
      Runs any action on any registered extension.
      Calls POST {url}/execute on the target extension.

Authentication: a single static bearer token stored in .env as MCP_TOKEN.
Set that token in your MCP client config — no database lookup needed.

MCP client config example (Claude Desktop / Cursor):
  {
    "mcpServers": {
      "jesseverse": {
        "url": "https://jesseverse-backend.vercel.app/mcp",
        "headers": { "Authorization": "Bearer <your MCP_TOKEN>" }
      }
    }
  }
"""
import json

from starlette.types import Receive, Scope, Send
from mcp.server import Server
from mcp.server.streamable_http_manager import StreamableHTTPSessionManager
from mcp import types

from app.core.config import get_settings
from app.extensions import service as ext_service

_settings = get_settings()


# ── Tool logic (plain async functions — no framework decorators) ──────────────

async def _list_extensions() -> str:
    extensions = ext_service.list_extensions()
    if not extensions:
        return "No extensions registered yet. Add one via POST /api/extensions."

    results = []
    for ext in extensions:
        try:
            caps = await ext_service.fetch_capabilities(ext["url"])
            cap_lines = []
            for cap in caps:
                params = cap.get("parameters", [])
                param_str = (
                    ", ".join(
                        f"{p['name']}({'required' if p.get('required') else 'optional'})"
                        for p in params
                    )
                    or "no params"
                )
                cap_lines.append(f"    • {cap['name']}: {cap.get('description', '')} [{param_str}]")
            caps_text = "\n".join(cap_lines) if cap_lines else "    (no capabilities returned)"
        except Exception as e:
            caps_text = f"    (could not fetch capabilities: {e})"
        results.append(f"[{ext['name']}] {ext.get('description', '')}\n{caps_text}")

    return "\n\n".join(results)


async def _use(extension: str, action: str, parameters: dict) -> str:
    ext = ext_service.get_extension(extension)
    if not ext:
        known = [e["name"] for e in ext_service.list_extensions()]
        return (
            f"Extension '{extension}' not found. "
            f"Registered extensions: {', '.join(known) or 'none'}"
        )
    try:
        result = await ext_service.proxy_execute(ext["url"], action, parameters)
    except Exception as e:
        return f"Error calling {extension}/{action}: {e}"
    if not result.get("success"):
        return f"Error: {result.get('error', 'Unknown error')}"
    data = result.get("data")
    return json.dumps(data, indent=2, default=str) if data is not None else "Done."


# ── MCP Server ───────────────────────────────────────────────────────────────
# Build the low-level MCP Server with tool handlers, then hand it to a
# StreamableHTTPSessionManager(stateless=True).  The session manager correctly
# uses task_group.start() so the server task is ready *before* handle_request
# is called — fixing the race condition from the old per-request
# StreamableHTTPServerTransport + tg.start_soon approach.

def _build_mcp_server() -> Server:
    server = Server("jesseverse")

    @server.list_tools()
    async def handle_list_tools() -> list[types.Tool]:
        return [
            types.Tool(
                name="list_extensions",
                description=(
                    "List every registered extension and the actions each one supports. "
                    "Call this first to discover what you can do."
                ),
                inputSchema={"type": "object", "properties": {}},
            ),
            types.Tool(
                name="use",
                description="Execute any action on any registered extension.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "extension": {"type": "string", "description": "The extension name (as shown in list_extensions)."},
                        "action": {"type": "string", "description": "The action name to run."},
                        "parameters": {"type": "object", "description": "Parameters for the action — use {} if none."},
                    },
                    "required": ["extension", "action", "parameters"],
                },
            ),
        ]

    @server.call_tool()
    async def handle_call_tool(name: str, arguments: dict) -> list[types.TextContent]:
        if name == "list_extensions":
            text = await _list_extensions()
        elif name == "use":
            text = await _use(
                arguments.get("extension", ""),
                arguments.get("action", ""),
                arguments.get("parameters", {}),
            )
        else:
            text = f"Unknown tool: {name}"
        return [types.TextContent(type="text", text=text)]

    return server


# Module-level session manager — shared across all requests.
# main.py must run `session_manager.run()` in its lifespan so the internal
# task group is live before any requests arrive.
session_manager = StreamableHTTPSessionManager(
    app=_build_mcp_server(),
    json_response=True,
    stateless=True,
)


# ── MCP route handler ─────────────────────────────────────────────────────────
# Registered in main.py via app.add_route("/mcp", mcp_endpoint).
# Does Bearer-token auth, then delegates to the session manager.

async def mcp_endpoint(scope: Scope, receive: Receive, send: Send) -> None:
    # ── Auth ──────────────────────────────────────────────────────────────────
    headers = {k.lower(): v for k, v in scope.get("headers", [])}
    auth = headers.get(b"authorization", b"").decode()
    token = auth[7:] if auth.lower().startswith("bearer ") else ""
    if token != _settings.mcp_token:
        body = json.dumps({
            "error": "invalid_token",
            "error_description": "Authentication required",
        }).encode()
        await send({
            "type": "http.response.start",
            "status": 401,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode()),
                (b"www-authenticate", b'Bearer error="invalid_token"'),
            ],
        })
        await send({"type": "http.response.body", "body": body})
        return

    await session_manager.handle_request(scope, receive, send)
