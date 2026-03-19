from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.auth import require_api_key, require_cron_secret
from app.reminders import service as rem_service

router = APIRouter()


# ── Digest endpoints ───────────────────────────────────────────────────────────

@router.post("/digest")
async def run_digest(
    force: bool = Query(default=False, description="Force a digest immediately, ignoring schedules"),
    _: None = Depends(require_cron_secret),
):
    """
    Triggered by Vercel cron every hour (UTC).
    Evaluates all enabled triggers and executes those due at this minute.
    If force=true, bypasses schedules and runs one digest immediately.
    """
    if force:
        row = await rem_service.generate_and_store_digest()
        return {
            "ok": True,
            "forced": True,
            "generated_at": row.get("generated_at"),
            "total_count": row.get("total_count"),
            "id": row.get("id"),
        }

    executed = await rem_service.run_due_triggers()
    return {
        "ok": True,
        "forced": False,
        "ran": len(executed),
        "executed": executed,
    }


@router.get("/digest/latest")
def latest_digest(_: None = Depends(require_api_key)):
    """Return the most recently stored daily digest."""
    row = rem_service.get_latest_digest()
    if not row:
        raise HTTPException(status_code=404, detail="No digests generated yet")
    return row


# ── Trigger CRUD ───────────────────────────────────────────────────────────────

@router.get("/triggers")
def list_triggers():
    return rem_service.list_triggers()


class TriggerCreate(BaseModel):
    name: str
    schedule: str
    action: str = "morning_briefing"
    config: dict = {}


@router.post("/triggers", status_code=201)
def create_trigger(body: TriggerCreate, _: None = Depends(require_api_key)):
    return rem_service.create_trigger(
        name=body.name,
        schedule=body.schedule,
        action=body.action,
        config=body.config,
    )


@router.delete("/triggers/{name}", status_code=204)
def delete_trigger(name: str, _: None = Depends(require_api_key)):
    existing = rem_service.get_trigger(name)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Trigger '{name}' not found")
    rem_service.delete_trigger(name)


class TriggerPatch(BaseModel):
    enabled: bool


@router.patch("/triggers/{name}")
def patch_trigger(name: str, body: TriggerPatch, _: None = Depends(require_api_key)):
    """Enable or disable a trigger without deleting it."""
    existing = rem_service.get_trigger(name)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Trigger '{name}' not found")
    return rem_service.set_trigger_enabled(name, body.enabled)
