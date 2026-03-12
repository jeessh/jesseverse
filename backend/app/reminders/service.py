# Reminder aggregation service.
#
# Responsibilities:
#   - gather_all_reminders(): polls every online extension that advertises
#     get_reminders and returns consolidated per-extension sections.
#   - generate_and_store_digest(): calls gather, formats human-readable text,
#     persists a row in daily_digests, bumps trigger.last_run_at.
#   - get_latest_digest(): returns the most recent daily_digests row.
#   - Trigger CRUD: create / list / update / delete rows in triggers.

import sys
from datetime import datetime, timezone

from app.core.database import get_supabase
from app.extensions import service as ext_service


# ── Reminder gathering ─────────────────────────────────────────────────────────

async def gather_all_reminders() -> list[dict]:
    """
    Collect reminders from every online extension that has a get_reminders action.
    Returns a list of section dicts:
        { "extension": str, "label": str, "items": list[dict] }
    """
    extensions = [
        e for e in ext_service.list_extensions()
        if (e.get("visibility") or "online") == "online"
    ]

    sections: list[dict] = []

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
                if data:
                    sections.append({
                        "extension": ext["name"],
                        "label": "",
                        "items": data,
                    })
            elif isinstance(data, dict):
                soon = data.get("due_within_3_days") or []
                week = data.get("due_within_7_days") or []
                if soon:
                    sections.append({
                        "extension": ext["name"],
                        "label": "Due within 3 days",
                        "items": soon,
                    })
                if week:
                    sections.append({
                        "extension": ext["name"],
                        "label": "Due within 7 days",
                        "items": week,
                    })
        except Exception as exc:
            print(f"[reminders] skipping {ext['name']}: {exc}", file=sys.stderr)
            continue

    return sections


def _format_sections(sections: list[dict]) -> str:
    """Render sections as the friendly text Poke will read out."""
    if not sections:
        return "No reminders across all apps. You're all caught up! 🎉"

    lines: list[str] = []
    total = sum(len(s["items"]) for s in sections)
    lines.append(f"☀️ Good morning! You have {total} reminder{'s' if total != 1 else ''} today.\n")

    for section in sections:
        header = f"[{section['extension']}]"
        if section["label"]:
            header += f" — {section['label']}"
        lines.append(header)
        for item in section["items"]:
            # 3mplymnt shape: role + company; dontforget shape: title + course; etc.
            name = (
                item.get("role")
                or item.get("title")
                or item.get("name")
                or item.get("company")
                or "?"
            )
            context = item.get("company") or item.get("course") or ""
            line = f"  • {name}"
            if context and context != name:
                line += f" @ {context}"
            if item.get("due_at"):
                line += f" — due {item['due_at']}"
            elif item.get("remind_at"):
                line += f" — remind {item['remind_at'][:16].replace('T', ' ')}"
            lines.append(line)
            lines.append(f"    id: {item.get('id', '?')}")
        lines.append("")

    return "\n".join(lines).rstrip()


# ── Digest storage ─────────────────────────────────────────────────────────────

async def generate_and_store_digest() -> dict:
    """
    Poll all extensions, format the digest, persist it, bump trigger.last_run_at.
    Returns the newly stored daily_digests row.
    """
    sections = await gather_all_reminders()
    total = sum(len(s["items"]) for s in sections)
    text = _format_sections(sections)

    db = get_supabase()
    result = db.table("daily_digests").insert({
        "sections": sections,
        "total_count": total,
        "raw_text": text,
    }).execute()

    row = (result.data or [{}])[0]

    # bump last_run_at on the morning_briefing trigger (best-effort)
    try:
        db.table("triggers").update({
            "last_run_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("name", "morning_briefing").execute()
    except Exception:
        pass

    return row


def get_latest_digest() -> dict | None:
    """Return the most recently generated daily_digests row, or None."""
    result = (
        get_supabase()
        .table("daily_digests")
        .select("*")
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    return rows[0] if rows else None


# ── Trigger CRUD ───────────────────────────────────────────────────────────────

def list_triggers() -> list[dict]:
    return get_supabase().table("triggers").select("*").order("created_at").execute().data or []


def get_trigger(name: str) -> dict | None:
    rows = (
        get_supabase()
        .table("triggers")
        .select("*")
        .eq("name", name)
        .limit(1)
        .execute()
        .data or []
    )
    return rows[0] if rows else None


def create_trigger(name: str, schedule: str, action: str = "morning_briefing", config: dict | None = None) -> dict:
    db = get_supabase()
    db.table("triggers").upsert(
        {
            "name": name,
            "schedule": schedule,
            "action": action,
            "config": config or {},
        },
        on_conflict="name",
    ).execute()
    rows = db.table("triggers").select("*").eq("name", name).limit(1).execute().data or []
    return rows[0]


def delete_trigger(name: str) -> None:
    get_supabase().table("triggers").delete().eq("name", name).execute()


def set_trigger_enabled(name: str, enabled: bool) -> dict | None:
    db = get_supabase()
    db.table("triggers").update({
        "enabled": enabled,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("name", name).execute()
    return get_trigger(name)
