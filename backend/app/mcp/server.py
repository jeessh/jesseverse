"""
Jessiverse MCP server.

Exposes two tools to any MCP-compatible AI client (Claude Desktop, Cursor, etc.):

  list_extensions()
      Returns every registered extension and the actions it supports.
      Calls GET {url}/capabilities on each extension in real time.

  use(extension, action, parameters)
      Runs any action on any registered extension.
      Calls POST {url}/execute on the target extension.

Authentication: a single static bearer token stored in .env as MCP_TOKEN.
Set that token in your MCP client config — no database lookup needed.

MCP client config example (Claude Desktop):
  {
    "mcpServers": {
      "jessiverse": {
        "url": "http://localhost:8000/mcp",
        "headers": { "Authorization": "Bearer <your MCP_TOKEN>" }
      }
    }
  }
"""
import json
from typing import Any

from mcp.server.fastmcp import FastMCP

from app.core.config import get_settings
from app.extensions import service as ext_service


# ── Single-token auth ─────────────────────────────────────────────────────────
# Read the Bearer token from the Authorization header directly and validate
# it ourselves — no OAuth discovery machinery needed.

class _BearerAuth:
    """Thin ASGI wrapper: rejects requests whose Bearer token doesn't match MCP_TOKEN."""

    def __init__(self, app: Any, token: str) -> None:
        self._app = app
        self._token = token

    async def __call__(self, scope: Any, receive: Any, send: Any) -> None:
        if scope["type"] == "http":
            headers = {k.lower(): v for k, v in scope.get("headers", [])}
            auth = headers.get(b"authorization", b"").decode()
            bearer = auth[7:] if auth.lower().startswith("bearer ") else ""
            if bearer != self._token:
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


_settings = get_settings()

# streamable_http_path="/" means the MCP route lives at "/" inside the sub-app.
# With app.mount("/mcp", ...) in main.py the public URL becomes just /mcp.
mcp = FastMCP(
    name="jessiverse",
    stateless_http=True,
    streamable_http_path="/",
)


# ── Tools ─────────────────────────────────────────────────────────────────────

@mcp.tool()
async def list_extensions() -> str:
    """
    List every registered extension and the actions each one supports.
    Call this first to discover what you can do.
    """
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


@mcp.tool()
async def use(extension: str, action: str, parameters: dict) -> str:
    """
    Execute any action on any registered extension.

    Args:
        extension:  The extension name (as shown in list_extensions).
        action:     The action name to run.
        parameters: A dict of parameters for the action (use {} for none).

    Example:
        use("expenses", "add_expense", {"amount": 12.50, "category": "food"})
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


# ── ASGI app (mounted in main.py at /mcp) ────────────────────────────────────
# Wrap with bearer-token auth before mounting.

mcp_asgi_app = _BearerAuth(mcp.streamable_http_app(), _settings.mcp_token)
