# crud against the extensions table + http proxy to extension backends
#
# extension protocol (every extension must implement):
#   get  {url}/info          →  { title, description, version, author?, icon_url?, homepage_url? }
#   get  {url}/capabilities  →  [{ name, description, parameters: [{name, type, required}] }]
#   post {url}/execute       →  body: { action, parameters }  ⇒  { success, data?, error? }
import json
import sys
import httpx
import time
from collections import Counter
from datetime import datetime, timezone, timedelta
from app.core.database import get_supabase


# ── Registry (Supabase) ───────────────────────────────────────────────────────

def list_extensions() -> list[dict]:
    db = get_supabase()
    exts = db.table("extensions").select("*").execute().data or []
    if not exts:
        return []

    # fetch the latest action-log timestamp per extension (one round-trip)
    logs = (
        db.table("action_logs")
        .select("extension_name, created_at")
        .order("created_at", desc=True)
        .limit(500)
        .execute()
        .data or []
    )
    last_used: dict[str, str] = {}
    for row in logs:
        name = row["extension_name"]
        if name not in last_used:
            last_used[name] = row["created_at"]

    # attach last_used_at, then sort: most-recently-used first, never-used after (by name)
    for ext in exts:
        ext["last_used_at"] = last_used.get(ext["name"])

    def _sort_key(e: dict):
        ts = e.get("last_used_at")
        if ts:
            try:
                epoch = datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
                return (0, -epoch, "")
            except Exception:
                pass
        return (1, 0.0, e.get("name", ""))

    exts.sort(key=_sort_key)
    return exts


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
    allowed = {k: v for k, v in updates.items() if k in ("name", "url", "description", "icon_url", "supabase_url", "vercel_url", "visibility")}
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
    except Exception as exc:
        print(f"[log_action] FAILED to write audit log: {exc}", file=sys.stderr)


def get_action_logs(extension_name: str, limit: int = 20, offset: int = 0) -> dict:
    q = (
        get_supabase()
        .table("action_logs")
        .select("*", count="exact")
        .eq("extension_name", extension_name)
        .order("created_at", desc=True)
        .limit(limit)
        .range(offset, offset + limit - 1)
    )
    result = q.execute()
    return {"data": result.data or [], "total": result.count or 0}


def get_all_action_logs(
    limit: int = 20,
    offset: int = 0,
    extension_name: str | None = None,
    source: str | None = None,
    success: bool | None = None,
) -> dict:
    q = (
        get_supabase()
        .table("action_logs")
        .select("*", count="exact")
        .order("created_at", desc=True)
    )
    if extension_name:
        q = q.eq("extension_name", extension_name)
    if source:
        q = q.eq("source", source)
    if success is not None:
        q = q.eq("success", success)
    q = q.limit(limit).range(offset, offset + limit - 1)
    result = q.execute()
    return {"data": result.data or [], "total": result.count or 0}


def get_action_log_analytics(
    days: int = 30,
    extension_name: str | None = None,
    source: str | None = None,
) -> dict:
    lookback_days = min(max(days, 1), 365)
    since_dt = datetime.now(timezone.utc) - timedelta(days=lookback_days - 1)
    since_iso = since_dt.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    q = (
        get_supabase()
        .table("action_logs")
        .select("extension_name, action, source, success, created_at", count="exact")
        .gte("created_at", since_iso)
        .order("created_at", desc=False)
        .limit(5000)
    )
    if extension_name:
        q = q.eq("extension_name", extension_name)
    if source:
        q = q.eq("source", source)

    result = q.execute()
    rows = result.data or []
    total_matching = result.count or 0

    success_count = 0
    error_count = 0
    source_counter: Counter[str] = Counter()
    action_counter: Counter[str] = Counter()
    extension_counter: Counter[str] = Counter()
    daily_map: dict[str, dict[str, int]] = {}

    current_day = since_dt.date()
    for _ in range(lookback_days):
        key = current_day.isoformat()
        daily_map[key] = {"date": key, "total": 0, "success": 0, "error": 0}
        current_day += timedelta(days=1)

    for row in rows:
        success = bool(row.get("success"))
        if success:
            success_count += 1
        else:
            error_count += 1

        src = str(row.get("source") or "unknown")
        source_counter[src] += 1

        action = str(row.get("action") or "unknown")
        action_counter[action] += 1

        ext = str(row.get("extension_name") or "unknown")
        extension_counter[ext] += 1

        created_at = str(row.get("created_at") or "")
        day_key = created_at[:10] if len(created_at) >= 10 else ""
        if day_key in daily_map:
            daily_map[day_key]["total"] += 1
            if success:
                daily_map[day_key]["success"] += 1
            else:
                daily_map[day_key]["error"] += 1

    total_events = len(rows)
    success_rate = round((success_count / total_events) * 100, 1) if total_events else 0.0

    return {
        "window_days": lookback_days,
        "since": since_iso,
        "sampled": total_matching > len(rows),
        "sample_size": len(rows),
        "total_matching": total_matching,
        "totals": {
            "events": total_events,
            "success": success_count,
            "error": error_count,
            "success_rate": success_rate,
            "unique_actions": len(action_counter),
            "unique_extensions": len(extension_counter),
        },
        "sources": [
            {"source": name, "count": count}
            for name, count in source_counter.most_common()
        ],
        "top_actions": [
            {"action": name, "count": count}
            for name, count in action_counter.most_common(10)
        ],
        "top_extensions": [
            {"extension": name, "count": count}
            for name, count in extension_counter.most_common(10)
        ],
        "daily": list(daily_map.values()),
    }


# ── protocol proxy ─────────────────────────────────────────────────────────────

_http_client: httpx.AsyncClient | None = None
_capabilities_cache: dict[str, tuple[float, list[dict]]] = {}
_CAPABILITIES_CACHE_TTL_SECONDS = 60


def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(
            limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
            follow_redirects=True,
        )
    return _http_client


async def close_http_client() -> None:
    global _http_client
    if _http_client is not None:
        await _http_client.aclose()
        _http_client = None


def _normalized_extension_url(url: str) -> str:
    return url.rstrip("/")


def invalidate_capabilities_cache(url: str | None = None) -> None:
    if url is None:
        _capabilities_cache.clear()
        return
    _capabilities_cache.pop(_normalized_extension_url(url), None)

async def fetch_info(url: str) -> dict:
    normalized_url = _normalized_extension_url(url)
    client = get_http_client()
    resp = await client.get(f"{normalized_url}/info", timeout=10)
    resp.raise_for_status()
    return resp.json()


async def fetch_capabilities(
    url: str,
    *,
    use_cache: bool = True,
    max_age_seconds: int = _CAPABILITIES_CACHE_TTL_SECONDS,
) -> list[dict]:
    normalized_url = _normalized_extension_url(url)
    now = time.monotonic()

    if use_cache:
        cached = _capabilities_cache.get(normalized_url)
        if cached is not None:
            cached_at, cached_data = cached
            if now - cached_at <= max_age_seconds:
                return cached_data

    client = get_http_client()
    resp = await client.get(f"{normalized_url}/capabilities", timeout=10)
    resp.raise_for_status()
    capabilities = resp.json()
    if not isinstance(capabilities, list):
        raise RuntimeError("Extension did not return a capabilities array")

    _capabilities_cache[normalized_url] = (now, capabilities)
    return capabilities


async def proxy_execute(url: str, action: str, parameters: dict) -> dict:
    normalized_url = _normalized_extension_url(url)
    client = get_http_client()
    resp = await client.post(
        f"{normalized_url}/execute",
        json={"action": action, "parameters": parameters},
        timeout=30,
    )
    if not resp.is_success:
        # capture the full response body so callers can log the real error
        try:
            body = resp.json()
            detail = body.get("error") or body.get("detail") or json.dumps(body)
        except Exception:
            detail = resp.text or f"HTTP {resp.status_code}"
        raise RuntimeError(
            f"HTTP {resp.status_code} from extension:\n{detail}"
        )
    return resp.json()
