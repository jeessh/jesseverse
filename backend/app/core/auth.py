from fastapi import Header, HTTPException, status
from app.core.config import get_settings


async def require_api_key(x_api_key: str | None = Header(default=None, alias="X-API-Key")):
    # rejects requests with a wrong or missing x-api-key header
    if not x_api_key or x_api_key != get_settings().api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )


async def require_cron_secret(
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
):
    """Accepts Vercel cron requests (Authorization: Bearer <CRON_SECRET>)
    or local test calls (X-API-Key header as fallback)."""
    settings = get_settings()
    # bearer token path (vercel cron)
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:]
        if token == settings.cron_secret:
            return
    # fallback: api key for local dev / manual triggers
    if x_api_key and x_api_key == settings.api_key:
        return
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing cron secret",
    )
