"""
Template Pydantic models for new apps.

Define your request/response schemas here.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ItemBase(BaseModel):
    """Base schema with shared fields."""
    title: str
    content: Optional[str] = None


class ItemCreate(ItemBase):
    """Schema for creating items."""
    pass


class ItemResponse(ItemBase):
    """Schema for item responses."""
    id: str
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
