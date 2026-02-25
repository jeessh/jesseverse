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
        raise HTTPException(status_code=502, detail=str(e))
    return result
