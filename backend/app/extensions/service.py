"""
Extension service — CRUD against the extensions table + HTTP proxy to extension backends.

Extension protocol (every extension backend must implement):
    GET  {url}/capabilities  →  [{ name, description, parameters: [{name, type, required}] }]
    POST {url}/execute       →  body: { action, parameters }  →  { success, data?, error? }
"""
import httpx
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


def register_extension(name: str, url: str, description: str = "") -> dict:
    url = url.rstrip("/")
    result = (
        get_supabase()
        .table("extensions")
        .upsert({"name": name, "url": url, "description": description}, on_conflict="name")
        .execute()
    )
    return result.data[0]


def delete_extension(name: str) -> None:
    get_supabase().table("extensions").delete().eq("name", name).execute()


# ── Protocol proxy ────────────────────────────────────────────────────────────

async def fetch_capabilities(url: str) -> list[dict]:
    """GET {url}/capabilities — returns the extension's action list."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{url}/capabilities")
        resp.raise_for_status()
        return resp.json()


async def proxy_execute(url: str, action: str, parameters: dict) -> dict:
    """POST {url}/execute — runs an action and returns the result."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{url}/execute",
            json={"action": action, "parameters": parameters},
        )
        resp.raise_for_status()
        return resp.json()
