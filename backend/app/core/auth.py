from fastapi import Header, HTTPException, status
from app.core.config import get_settings


async def require_api_key(x_api_key: str | None = Header(default=None, alias="X-API-Key")):
    """Dependency: rejects requests whose X-API-Key header doesn't match API_KEY in .env."""
    if not x_api_key or x_api_key != get_settings().api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )
