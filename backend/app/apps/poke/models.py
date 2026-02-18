"""Pydantic models for Poke integration."""
from typing import Optional
from pydantic import BaseModel


class PokeWebhookPayload(BaseModel):
    """Incoming webhook payload from Poke."""
    message: str
    phone_number: str
    timestamp: Optional[str] = None
    # Add more fields based on Poke's actual webhook format
    metadata: Optional[dict] = None


class PokeResponse(BaseModel):
    """Response to send back to Poke."""
    success: bool
    response: str
    error: Optional[str] = None
