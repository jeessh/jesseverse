# crud against the extensions table + http proxy to extension backends
#
# extension protocol (every extension must implement):
#   get  {url}/info          →  { title, description, version, author?, icon_url?, homepage_url? }
#   get  {url}/capabilities  →  [{ name, description, parameters: [{name, type, required}] }]
#   post {url}/execute       →  body: { action, parameters }  ⇒  { success, data?, error? }
import json
import httpx
from datetime import datetime, timezone
from app.core.database import get_supabase


# ── Registry (Supabase) ───────────────────────────────────────────────────────

def list_extensions() -> list[dict]:
    result = get_supabase().table("extensions").select("*").order("name").execute()
    return result.data or []


def get_extension(name: str) -> dict | None:
    result = (
        get_supabase()
        .table("extensions")
        .select("*")
        .eq("name", name)
        .single()
        .execute()
    )
    return result.data if result.data else None


def register_extension(
    name: str,
    url: str,
    description: str = "",
    title: str = "",
    version: str = "",
    author: str = "",
    icon_url: str = "",
    homepage_url: str = "",
) -> dict:
    url = url.rstrip("/")
    db = get_supabase()
    # supabase-py doesn't support chaining .select() after .upsert(), so we
    # do the write then fetch the row in a second call
    db.table("extensions").upsert(
        {
            "name": name,
            "url": url,
            "description": description,
            "title": title,
            "version": version,
            "author": author,
            "icon_url": icon_url,
            "homepage_url": homepage_url,
        },
        on_conflict="name",
    ).execute()
    result = db.table("extensions").select("*").eq("name", name).single().execute()
    return result.data


def update_extension(name: str, updates: dict) -> dict:
    allowed = {k: v for k, v in updates.items() if k in ("name", "url", "description", "icon_url", "supabase_url", "vercel_url")}
    if "url" in allowed:
        allowed["url"] = allowed["url"].rstrip("/")
    allowed["updated_at"] = datetime.now(timezone.utc).isoformat()
    db = get_supabase()
    db.table("extensions").update(allowed).eq("name", name).execute()
    new_name = allowed.get("name", name)
    result = db.table("extensions").select("*").eq("name", new_name).single().execute()
    return result.data


def delete_extension(name: str) -> None:
    get_supabase().table("extensions").delete().eq("name", name).execute()


# ── action logs ────────────────────────────────────────────────────────────────────────

def log_action(
    extension_name: str,
    action: str,
    params: dict,
    success: bool,
    error: str | None = None,
    result_summary: str | None = None,
    prompt: str | None = None,
    source: str = "mcp",
) -> None:
    """Fire-and-forget: write one action_log row. Never raises."""
    try:
        get_supabase().table("action_logs").insert({
            "extension_name": extension_name,
            "action": action,
            "params": params,
            "success": success,
            "error": error,
            "result_summary": result_summary,
            "prompt": prompt,
            "source": source,
        }).execute()
    except Exception:
        pass  # logging should never crash the caller


def get_action_logs(extension_name: str, limit: int = 50) -> list[dict]:
    result = (
        get_supabase()
        .table("action_logs")
        .select("*")
        .eq("extension_name", extension_name)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


# ── protocol proxy ─────────────────────────────────────────────────────────────

async def fetch_info(url: str) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{url}/info")
        resp.raise_for_status()
        return resp.json()


async def fetch_capabilities(url: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{url}/capabilities")
        resp.raise_for_status()
        return resp.json()


async def proxy_execute(url: str, action: str, parameters: dict) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{url}/execute",
            json={"action": action, "parameters": parameters},
        )
        resp.raise_for_status()
        return resp.json()
