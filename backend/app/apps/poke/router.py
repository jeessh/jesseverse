"""
Poke integration webhook handler.

This app receives messages from Poke and routes them to the appropriate
app handler based on message content.
"""
from fastapi import APIRouter, HTTPException, Header, status
from typing import Optional

from app.core.config import get_settings
from app.apps import get_message_handlers
from .models import PokeWebhookPayload, PokeResponse
from . import service

router = APIRouter()
PREFIX = "/api/poke"
TAGS = ["Poke Integration"]


@router.post("/webhook", response_model=PokeResponse)
async def poke_webhook(
    payload: PokeWebhookPayload,
    x_poke_signature: Optional[str] = Header(None),
):
    """
    Webhook endpoint for Poke messages.
    
    Poke sends messages here when users text your number.
    The message is routed to the appropriate app handler.
    """
    settings = get_settings()
    
    # Verify webhook signature if configured
    if settings.poke_webhook_secret:
        if not x_poke_signature:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing webhook signature",
            )
        
        if not service.verify_signature(payload, x_poke_signature, settings.poke_webhook_secret):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature",
            )
    
    # Route message to appropriate handler
    response_text = await service.route_message(
        message=payload.message,
        phone_number=payload.phone_number,
        handlers=get_message_handlers(),
    )
    
    return PokeResponse(
        success=True,
        response=response_text,
    )


@router.get("/handlers")
async def list_handlers():
    """List all registered message handlers (for debugging)."""
    handlers = get_message_handlers()
    return {
        "handlers": list(handlers.keys()),
        "count": len(handlers),
    }
