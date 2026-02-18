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
        "url": "http://localhost:8000/mcp/mcp",
        "headers": { "Authorization": "Bearer <your MCP_TOKEN>" }
      }
    }
  }
"""
import json
import asyncio

from mcp.server.fastmcp import FastMCP
from mcp.server.fastmcp.server import AuthSettings
from mcp.server.auth.provider import AccessToken, TokenVerifier
from mcp.server.auth.middleware.auth_context import get_access_token

from app.core.config import get_settings
from app.extensions import service as ext_service


# ── Single-token auth ─────────────────────────────────────────────────────────
# It's just you, so one static token is all that's needed.

class StaticTokenVerifier:
    """Accepts only the single MCP_TOKEN value from .env."""

    def __init__(self, expected: str):
        self._expected = expected

    async def verify_token(self, token: str) -> AccessToken | None:
        if token != self._expected:
            return None
        return AccessToken(
            token=token,
            client_id="owner",
            scopes=["jessiverse"],
        )


_settings = get_settings()
_server_url = _settings.server_url.rstrip("/")

mcp = FastMCP(
    name="jessiverse",
    stateless_http=True,
    token_verifier=StaticTokenVerifier(_settings.mcp_token),
    auth=AuthSettings(
        issuer_url=_server_url,
        resource_server_url=_server_url,
        required_scopes=["jessiverse"],
    ),
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

mcp_asgi_app = mcp.streamable_http_app()
