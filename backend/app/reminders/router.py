from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import require_api_key, require_cron_secret
from app.reminders import service as rem_service

router = APIRouter()


# ── Digest endpoints ───────────────────────────────────────────────────────────

@router.post("/digest")
async def run_digest(_: None = Depends(require_cron_secret)):
    """
    Triggered by Vercel cron at 09:00 UTC daily.
    Polls all extensions, generates the morning briefing, stores it.
    """
    row = await rem_service.generate_and_store_digest()
    return {
        "ok": True,
        "generated_at": row.get("generated_at"),
        "total_count": row.get("total_count"),
        "id": row.get("id"),
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
