from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from app.extensions import service
from app.core.auth import require_api_key
import json

router = APIRouter()


class RegisterBody(BaseModel):
    name: str
    url: str
    description: str = ""


class ExecuteBody(BaseModel):
    action: str
    parameters: dict = {}
    prompt: str | None = None   # optional: user intent forwarded by caller
    source: str = "mcp"         # 'mcp' | 'hub'


class UpdateBody(BaseModel):
    name: str | None = None
    url: str | None = None
    description: str | None = None
    icon_url: str | None = None
    supabase_url: str | None = None
    vercel_url: str | None = None


# ── read-only (no auth required) ─────────────────────────────────────────────────────

@router.get("")
def list_extensions():
    return service.list_extensions()


@router.get("/register")
async def register_preview(url: str = Query(..., description="Base URL of the extension")):
    # previews /info + /capabilities before the user confirms registration
    clean_url = url.rstrip("/")
    try:
        info = await service.fetch_info(clean_url)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not reach {clean_url}/info: {e}")
    for field in ("title", "description", "version"):
        if not info.get(field):
            raise HTTPException(
                status_code=422,
                detail=f"/info response is missing required field: '{field}'",
            )
    try:
        capabilities = await service.fetch_capabilities(clean_url)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not reach {clean_url}/capabilities: {e}")
    if not isinstance(capabilities, list):
        raise HTTPException(status_code=502, detail="Extension did not return a capabilities array")
    return {"info": info, "capabilities": capabilities}


# ── write operations (api key required) ──────────────────────────────────────

@router.post("", status_code=201, dependencies=[Depends(require_api_key)])
async def register_extension(body: RegisterBody):
    try:
        info = await service.fetch_info(body.url)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach {body.url}/info — is the extension deployed and does it implement GET /info? ({e})",
        )
    for field in ("title", "description", "version"):
        if not info.get(field):
            raise HTTPException(
                status_code=422,
                detail=f"/info response is missing required field: '{field}'",
            )
    return service.register_extension(
        name=body.name,
        url=body.url,
        description=info.get("description", body.description),
        title=info.get("title", ""),
        version=info.get("version", ""),
        author=info.get("author", ""),
        icon_url=info.get("icon_url", ""),
        homepage_url=info.get("homepage_url", ""),
    )


@router.patch("/{name}", dependencies=[Depends(require_api_key)])
def patch_extension(name: str, body: UpdateBody):
    if not service.get_extension(name):
        raise HTTPException(status_code=404, detail="Extension not found")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    return service.update_extension(name, updates)


@router.delete("/{name}", status_code=204, dependencies=[Depends(require_api_key)])
def delete_extension(name: str):
    if not service.get_extension(name):
        raise HTTPException(status_code=404, detail="Extension not found")
    service.delete_extension(name)


@router.post("/{name}/execute", dependencies=[Depends(require_api_key)])
async def execute_action(name: str, body: ExecuteBody):
    # proxy the action to the registered extension
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
        service.log_action(
            extension_name=name, action=body.action, params=body.parameters,
            success=False, error=str(e), prompt=body.prompt, source=body.source,
        )
        raise HTTPException(status_code=502, detail=str(e))

    # build a compact result_summary (≤500 chars) for the log
    result_summary: str | None = None
    if result.get("data") is not None:
        try:
            serialized = json.dumps(result["data"], default=str)
            result_summary = serialized[:500] + ("…" if len(serialized) > 500 else "")
        except Exception:
            pass

    service.log_action(
        extension_name=name, action=body.action, params=body.parameters,
        success=result.get("success", True),
        error=result.get("error"),
        result_summary=result_summary,
        prompt=body.prompt,
        source=body.source,
    )
    return result


@router.get("/{name}/logs")
def get_logs(name: str, limit: int = Query(50, le=200)):
    if not service.get_extension(name):
        raise HTTPException(status_code=404, detail="Extension not found")
    return service.get_action_logs(name, limit=limit)
