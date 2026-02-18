"""
Template router for new apps.

To use this template:
1. Copy the _template folder to a new folder (e.g., apps/myapp/)
2. Rename and modify as needed
3. The app will be auto-registered on startup
"""
from fastapi import APIRouter

from app.api.deps import AuthenticatedUser, Database
from .models import ItemCreate, ItemResponse
from . import service

# Router configuration
router = APIRouter()
PREFIX = "/api/template"  # Change this to your app's prefix
TAGS = ["Template"]       # Change this to your app's tags


@router.get("/", response_model=list[ItemResponse])
async def list_items(user: AuthenticatedUser, db: Database):
    """List all items for the current user."""
    return await service.get_items(db, user.id)


@router.post("/", response_model=ItemResponse)
async def create_item(
    item: ItemCreate,
    user: AuthenticatedUser,
    db: Database,
):
    """Create a new item."""
    return await service.create_item(db, user.id, item)


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: str,
    user: AuthenticatedUser,
    db: Database,
):
    """Get a specific item."""
    return await service.get_item(db, user.id, item_id)


@router.delete("/{item_id}")
async def delete_item(
    item_id: str,
    user: AuthenticatedUser,
    db: Database,
):
    """Delete an item."""
    await service.delete_item(db, user.id, item_id)
    return {"status": "deleted"}
