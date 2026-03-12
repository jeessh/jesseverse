# jesseverse mcp server
# exposes tools: list_extensions, use, check_reminders,
#                morning_briefing, create_trigger, list_triggers, delete_trigger
# auth: static bearer token from .env (MCP_TOKEN)
#
# mcp client config (claude desktop / cursor):
#   { "mcpServers": { "jesseverse": { "url": "https://jesseverse-backend.vercel.app/mcp",
#                                     "headers": { "Authorization": "Bearer <MCP_TOKEN>" } } } }
import json

import anyio
from mcp.server.fastmcp import FastMCP
from mcp.server.streamable_http import StreamableHTTPServerTransport
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import get_settings
from app.extensions import service as ext_service
from app.reminders import service as rem_service

_settings = get_settings()

# ── mcp server setup ────────────────────────────────────────────────────────────

mcp = FastMCP("jesseverse")

def _format_param(p: dict) -> str:
    # formats a capability parameter as a human-readable line for the ai
    req = "required" if p.get("required") else "optional"
    line = f"      {p['name']} ({p.get('type', 'string')}, {req})"
    desc = p.get("description")
    if desc:
        line += f" — {desc}"
    enum_vals = p.get("enum")
    if enum_vals:
        line += f"  [values: {' | '.join(enum_vals)}]"
    example = p.get("example")
    if example and not enum_vals:  # enum already shows valid values; skip redundant example
        line += f"  [e.g. {example!r}]"
    return line


@mcp.tool()
async def list_extensions() -> str:
    """List every registered extension and the actions each one supports,
    including all parameter types, descriptions, and accepted values.
    ALWAYS call this before use() — extension slugs and action names must be
    exact matches from this output or use() will fail."""
    all_extensions = ext_service.list_extensions()
    # only expose extensions that are actively online
    extensions = [e for e in all_extensions if (e.get("visibility") or "online") == "online"]
    if not extensions:
        return "No extensions registered yet. Add one via POST /api/extensions."

    results = []
    for ext in extensions:
        try:
            caps = await ext_service.fetch_capabilities(ext["url"])
            cap_lines = []
            for cap in caps:
                params = cap.get("parameters") or []
                # action header line
                cap_lines.append(
                    f"  • {cap['name']}: {cap.get('description', '')}"
                )
                if params:
                    for p in params:
                        cap_lines.append(_format_param(p))
                else:
                    cap_lines.append("      (no parameters)")
            caps_text = (
                "\n".join(cap_lines) if cap_lines else "  (no capabilities returned)"
            )
        except Exception as e:
            caps_text = f"  (could not fetch capabilities: {e})"
        header = f"[{ext['name']}] {ext.get('title', ext['name'])} — {ext.get('description', '')}"
        results.append(f"{header}\n{caps_text}")

    return "\n\n".join(results)


@mcp.tool()
async def use(extension: str, action: str, parameters: dict, prompt: str | None = None) -> str:
    """Execute an action on a registered extension.

    IMPORTANT — you must call list_extensions() first to get exact extension
    slugs and action names. Both values are case-sensitive exact matches.
    Do NOT guess or infer them; always look them up before calling this.

    Workflow:
      1. list_extensions()  — discover extensions, actions, and parameter schemas.
      2. use()              — call with the exact slug and action name from step 1.

    Args:
        extension: Extension slug exactly as returned by list_extensions(), e.g. "3mplymnt".
        action: Action name exactly as listed under that extension, e.g. "add_application".
        parameters: Dict matching the parameter schema. Include all required fields;
                    omit optional ones you don't need. Use {} when no params needed.
        prompt: Optional one-line description of why this is being called (shown in audit log).
    """
    ext = ext_service.get_extension(extension)
    if not ext:
        known = [e["name"] for e in ext_service.list_extensions() if (e.get("visibility") or "online") == "online"]
        ext_service.log_action(
            extension_name=extension, action=action, params=parameters,
            success=False,
            error=f"extension not found; known: {known}",
            prompt=prompt, source="poke",
        )
        return (
            f"Extension '{extension}' not found. "
            f"Known extensions: {', '.join(known) or 'none'}. "
            f"Call list_extensions() to get the exact slugs."
        )

    # block calls to extensions that aren't actively online
    vis = ext.get("visibility") or "online"
    if vis != "online":
        ext_service.log_action(
            extension_name=extension, action=action, params=parameters,
            success=False,
            error=f"extension is not online (visibility={vis})",
            prompt=prompt, source="poke",
        )
        return (
            f"Extension '{extension}' is currently unavailable (status: {vis.replace('_', ' ')})."
        )

    endpoint = f"{ext['url']}/execute"

    # validate the action name against the extension's capability list before proxying
    try:
        caps = await ext_service.fetch_capabilities(ext["url"])
        valid_actions = [c["name"] for c in caps]
        if action not in valid_actions:
            ext_service.log_action(
                extension_name=extension, action=action, params=parameters,
                success=False,
                error=f"action '{action}' not found; valid: {valid_actions}",
                prompt=prompt, source="poke",
            )
            return (
                f"Action '{action}' not found on extension '{extension}'.\n"
                f"Endpoint that would have been called: {endpoint}\n"
                f"Valid actions: {', '.join(valid_actions)}.\n"
                f"Check the exact name with list_extensions()."
            )
    except Exception as cap_err:
        # capabilities fetch failed — proceed anyway, let the extension return its own error
        pass

    try:
        result = await ext_service.proxy_execute(ext["url"], action, parameters)
    except Exception as e:
        ext_service.log_action(
            extension_name=extension, action=action, params=parameters,
            success=False, error=str(e), prompt=prompt, source="poke",
        )
        return f"Error calling {endpoint}: {e}"

    result_summary: str | None = None
    if result.get("data") is not None:
        try:
            serialized = json.dumps(result["data"], default=str)
            result_summary = serialized[:500] + ("…" if len(serialized) > 500 else "")
        except Exception:
            pass

    ext_service.log_action(
        extension_name=extension, action=action, params=parameters,
        success=result.get("success", True),
        error=result.get("error"),
        result_summary=result_summary,
        prompt=prompt,
        source="poke",
    )

    if not result.get("success"):
        err = result.get("error", "Unknown error")
        return (
            f"Error from {endpoint} ({action}): {err}\n"
            f"Hint: call list_extensions() to verify the action name and parameter names."
        )
    data = result.get("data")
    if data is not None:
        return f"# endpoint: {endpoint}\n{json.dumps(data, indent=2, default=str)}"
    return f"Done. (endpoint: {endpoint})"


@mcp.tool()
async def check_reminders() -> str:
    """Check for upcoming deadlines across all registered extensions.

    For every extension that advertises a get_reminders action, calls that
    action and collects results. Extensions may return either a flat list or
    a grouped object with due_within_3_days / due_within_7_days keys.

    Call this proactively at the start of a session.

    To act on a reminder:
      - Mark done: use(extension, "<update_action>", {"id": "...", ...})
    """
    extensions = ext_service.list_extensions()
    if not extensions:
        return "No extensions registered."

    # Collect reminders per extension, preserving grouped structure when present
    sections: list[tuple[str, str, list[dict]]] = []  # (ext_name, section_label, items)

    for ext in extensions:
        try:
            caps = await ext_service.fetch_capabilities(ext["url"])
            cap_names = {c.get("name") for c in caps}
            if "get_reminders" not in cap_names:
                continue
            result = await ext_service.proxy_execute(ext["url"], "get_reminders", {})
            if not result.get("success"):
                continue
            data = result.get("data")
            if not data:
                continue

            if isinstance(data, list):
                # flat array (legacy shape)
                for item in data:
                    item["_extension"] = ext["name"]
                sections.append((ext["name"], "", data))
            elif isinstance(data, dict):
                # grouped shape: { due_within_3_days: [...], due_within_7_days: [...] }
                soon = data.get("due_within_3_days") or []
                week = data.get("due_within_7_days") or []
                for item in soon + week:
                    item["_extension"] = ext["name"]
                if soon:
                    sections.append((ext["name"], "Due within 3 days", soon))
                if week:
                    sections.append((ext["name"], "Due within 7 days", week))
        except Exception:
            continue

    if not sections:
        return "No upcoming deadlines. You're all caught up!"

    lines: list[str] = []
    for ext_name, label, items in sections:
        header = f"[{ext_name}]" + (f" — {label}" if label else "")
        lines.append(header)
        for r in items:
            lines.append(
                f"  • {r.get('role', '?')} · {r.get('company', '?')}"
                + (f" — due {r['due_at']}" if r.get("due_at") else "")
            )
            lines.append(f"    ID: {r['id']}")
        lines.append("")

    return "\n".join(lines).strip()


@mcp.tool()
async def morning_briefing() -> str:
    """Return today's consolidated morning reminder digest.

    If a digest was already generated today (within the last 24 h) the cached
    version is returned instantly. Otherwise all extensions are polled live and
    the result is stored for future calls.

    Call this at the start of each session to surface everything that needs
    attention across all apps.
    """
    from datetime import datetime, timezone, timedelta

    latest = rem_service.get_latest_digest()
    if latest:
        generated_at = latest.get("generated_at") or ""
        try:
            ts = datetime.fromisoformat(generated_at.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) - ts < timedelta(hours=24):
                return latest.get("raw_text") or "Digest stored but no text found."
        except Exception:
            pass

    # nothing fresh — generate on the fly and store
    row = await rem_service.generate_and_store_digest()
    return row.get("raw_text") or "No reminders found across all apps."


@mcp.tool()
def list_triggers() -> str:
    """List all configured reminder triggers (name, schedule, enabled, last run).

    Triggers control when the automated morning digest is generated.
    """
    triggers = rem_service.list_triggers()
    if not triggers:
        return "No triggers configured."
    lines: list[str] = []
    for t in triggers:
        status = "enabled" if t.get("enabled") else "disabled"
        last = t.get("last_run_at") or "never"
        lines.append(
            f"  • {t['name']} | {t.get('schedule', '?')} | {status} | last run: {last}"
        )
    return "Triggers:\n" + "\n".join(lines)


@mcp.tool()
def create_trigger(name: str, schedule: str, action: str = "morning_briefing") -> str:
    """Create (or update) a named reminder trigger.

    Args:
        name:     Unique identifier for the trigger, e.g. "morning_briefing".
        schedule: Cron expression, e.g. "0 9 * * *" for 09:00 UTC daily.
        action:   Action the cron endpoint should perform. Default: morning_briefing.
    """
    t = rem_service.create_trigger(name=name, schedule=schedule, action=action)
    return f"Trigger '{t['name']}' saved with schedule '{t['schedule']}'."


@mcp.tool()
def delete_trigger(name: str) -> str:
    """Delete a reminder trigger by name.

    Args:
        name: Exact name of the trigger to delete (from list_triggers).
    """
    existing = rem_service.get_trigger(name)
    if not existing:
        return f"Trigger '{name}' not found. Use list_triggers() to see valid names."
    rem_service.delete_trigger(name)
    return f"Trigger '{name}' deleted."


# ── auth middleware ─────────────────────────────────────────────────────────────
# wraps the fastmcp asgi app and rejects bad tokens before they hit the mcp layer

class _BearerAuthMiddleware:
    def __init__(self, app: ASGIApp, token: str) -> None:
        self._app = app
        self._token = token

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http":
            method = scope.get("method", "")
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


# ── per-request mcp handler ──────────────────────────────────────────────────────
# fresh StreamableHTTPServerTransport per request — stateless, vercel-compatible

async def _mcp_handler(scope: Scope, receive: Receive, send: Send) -> None:
    # get requests are unauthenticated url-validity probes from mcp clients
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

    server = mcp._mcp_server  # low-level server with tools already registered
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


# mcp_asgi_app is registered at /mcp in main.py
mcp_asgi_app = _BearerAuthMiddleware(_mcp_handler, token=_settings.mcp_token)
