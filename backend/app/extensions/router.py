from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from app.extensions import service
from app.core.auth import require_api_key

router = APIRouter()


class RegisterBody(BaseModel):
    name: str
    url: str
    description: str = ""


class ExecuteBody(BaseModel):
    action: str
    parameters: dict = {}


# ── Read-only / probe (no auth required) ─────────────────────────────────────

@router.get("")
def list_extensions():
    return service.list_extensions()


@router.get("/probe")
async def probe_extension(url: str = Query(..., description="Base URL of the extension to probe")):
    """
    Probe a URL to confirm it speaks the Jessiverse extension protocol.
    Returns its capabilities list so the frontend can preview actions before registering.
    This endpoint is intentionally unauthenticated — it's only reading public metadata.
    """
    clean_url = url.rstrip("/")
    try:
        capabilities = await service.fetch_capabilities(clean_url)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not reach extension: {e}")
    if not isinstance(capabilities, list):
        raise HTTPException(status_code=502, detail="Extension did not return a capabilities array")
    return {"capabilities": capabilities}


# ── Write operations (API key required) ──────────────────────────────────────

@router.post("", status_code=201, dependencies=[Depends(require_api_key)])
def register_extension(body: RegisterBody):
    return service.register_extension(body.name, body.url, body.description)


@router.delete("/{name}", status_code=204, dependencies=[Depends(require_api_key)])
def delete_extension(name: str):
    if not service.get_extension(name):
        raise HTTPException(status_code=404, detail="Extension not found")
    service.delete_extension(name)


@router.post("/{name}/execute", dependencies=[Depends(require_api_key)])
async def execute_action(name: str, body: ExecuteBody):
    """
    Proxy an action call to the named extension.
    The extension must be registered and reachable.
    """
    ext = service.get_extension(name)
    if not ext:
        known = [e["name"] for e in service.list_extensions()]
        raise HTTPException(
            status_code=404,
            detail=f"Extension '{name}' not found. Registered: {', '.join(known) or 'none'}",
        )
    try:
        result = await service.proxy_execute(ext["url"], body.action, body.parameters)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    return result
