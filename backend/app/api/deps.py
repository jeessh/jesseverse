"""Shared API dependencies."""
from typing import Annotated, Optional
from fastapi import Depends, HTTPException, Header, status
from jose import JWTError, jwt
from pydantic import BaseModel
from supabase import Client

from app.core.config import get_settings
from app.core.database import get_db


class CurrentUser(BaseModel):
    """Authenticated user from Supabase JWT."""
    id: str
    email: Optional[str] = None
    phone: Optional[str] = None


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> CurrentUser:
    """
    Validate Supabase JWT and return current user.
    
    Usage in routes:
        @router.get("/protected")
        async def protected_route(user: CurrentUser = Depends(get_current_user)):
            return {"user_id": user.id}
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )
    
    try:
        # Extract token from "Bearer <token>"
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication scheme",
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
        )
    
    settings = get_settings()
    
    try:
        # Supabase JWTs use the anon key as the secret for verification
        # In production, you'd use the JWT secret from Supabase dashboard
        payload = jwt.decode(
            token,
            settings.supabase_anon_key,
            algorithms=["HS256"],
            audience="authenticated",
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
        
        return CurrentUser(
            id=user_id,
            email=payload.get("email"),
            phone=payload.get("phone"),
        )
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate token: {str(e)}",
        )


# Type alias for dependency injection
AuthenticatedUser = Annotated[CurrentUser, Depends(get_current_user)]
Database = Annotated[Client, Depends(get_db)]
