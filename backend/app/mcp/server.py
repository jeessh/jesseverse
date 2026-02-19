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

import anyio
from mcp.server.fastmcp import FastMCP
from mcp.server.streamable_http import StreamableHTTPServerTransport
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import get_settings
from app.extensions import service as ext_service

_settings = get_settings()

# ── FastMCP server ────────────────────────────────────────────────────────────

mcp = FastMCP("jesseverse")


@mcp.tool()
async def list_extensions() -> str:
    """List every registered extension and the actions each one supports.
    Call this first to discover what you can do."""
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
                cap_lines.append(
                    f"    • {cap['name']}: {cap.get('description', '')} [{param_str}]"
                )
            caps_text = (
                "\n".join(cap_lines) if cap_lines else "    (no capabilities returned)"
            )
        except Exception as e:
            caps_text = f"    (could not fetch capabilities: {e})"
        results.append(f"[{ext['name']}] {ext.get('description', '')}\n{caps_text}")

    return "\n\n".join(results)


@mcp.tool()
async def use(extension: str, action: str, parameters: dict) -> str:
    """Execute any action on any registered extension.

    Args:
        extension: The extension name (as shown in list_extensions).
        action: The action name to run.
        parameters: Parameters for the action — use {} if none.
    """
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


# ── Auth middleware ───────────────────────────────────────────────────────────
# Wraps the FastMCP ASGI app and rejects requests with a missing/wrong token
# before they reach the MCP layer.

class _BearerAuthMiddleware:
    def __init__(self, app: ASGIApp, token: str) -> None:
        self._app = app
        self._token = token

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            method = scope.get("method", "")
            # Only enforce auth on POST (the actual MCP JSON-RPC calls).
            # GET requests are unauthenticated probe/SSE checks used by MCP clients
            # to validate the URL — blocking them with 401 causes "Invalid MCP server URL".
            if method == "POST":
                headers = {k.lower(): v for k, v in scope.get("headers", [])}
                auth = headers.get(b"authorization", b"").decode()
                incoming = auth[7:] if auth.lower().startswith("bearer ") else ""
                if incoming != self._token:
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
        await self._app(scope, receive, send)


# ── Per-request MCP handler ───────────────────────────────────────────────────
# Uses mcp._mcp_server (the low-level Server FastMCP wraps) with a fresh
# StreamableHTTPServerTransport per request.  tg.start() waits for the server
# task to signal readiness before handle_request sends any messages — stateless
# and Vercel-compatible (no persistent task group needed).

async def _mcp_handler(scope: Scope, receive: Receive, send: Send) -> None:
    # GET requests are unauthenticated URL-validity probes from MCP clients.
    # Return a 200 JSON info response so the client confirms the URL is reachable.
    if scope.get("method") == "GET":
        body = json.dumps({
            "name": "jesseverse",
            "description": "Jesseverse MCP server — use POST with a Bearer token to call tools.",
            "protocolVersion": "2024-11-05",
        }).encode()
        await send({
            "type": "http.response.start",
            "status": 200,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode()),
            ],
        })
        await send({"type": "http.response.body", "body": body})
        return

    server = mcp._mcp_server  # low-level Server with tools already registered
    transport = StreamableHTTPServerTransport(
        mcp_session_id=None,
        is_json_response_enabled=True,
    )

    async with anyio.create_task_group() as tg:
        async def run_server(*, task_status=anyio.TASK_STATUS_IGNORED) -> None:
            async with transport.connect() as (read_stream, write_stream):
                task_status.started()
                await server.run(
                    read_stream,
                    write_stream,
                    server.create_initialization_options(),
                    stateless=True,
                )

        await tg.start(run_server)
        await transport.handle_request(scope, receive, send)
        tg.cancel_scope.cancel()


# mcp_asgi_app is what main.py registers at /mcp.
mcp_asgi_app = _BearerAuthMiddleware(_mcp_handler, token=_settings.mcp_token)
