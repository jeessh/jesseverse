# crud against the extensions table + http proxy to extension backends
#
# extension protocol (every extension must implement):
#   get  {url}/info          →  { title, description, version, author?, icon_url?, homepage_url? }
#   get  {url}/capabilities  →  [{ name, description, parameters: [{name, type, required}] }]
#   post {url}/execute       →  body: { action, parameters }  ⇒  { success, data?, error? }
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


def delete_extension(name: str) -> None:
    get_supabase().table("extensions").delete().eq("name", name).execute()


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
