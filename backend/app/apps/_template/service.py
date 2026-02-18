"""
Template service layer for new apps.

Business logic and database operations go here.
Keep routers thin - put logic in services.
"""
from typing import Optional
from fastapi import HTTPException, status
from supabase import Client

from .models import ItemCreate, ItemResponse


# Change this to your table name
TABLE_NAME = "template_items"


async def get_items(db: Client, user_id: str) -> list[ItemResponse]:
    """Get all items for a user."""
    response = db.table(TABLE_NAME).select("*").eq("user_id", user_id).execute()
    return [ItemResponse(**item) for item in response.data]


async def get_item(db: Client, user_id: str, item_id: str) -> ItemResponse:
    """Get a single item by ID."""
    response = (
        db.table(TABLE_NAME)
        .select("*")
        .eq("id", item_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    
    return ItemResponse(**response.data)


async def create_item(
    db: Client,
    user_id: str,
    item: ItemCreate,
) -> ItemResponse:
    """Create a new item."""
    data = {
        "user_id": user_id,
        **item.model_dump(),
    }
    
    response = db.table(TABLE_NAME).insert(data).execute()
    return ItemResponse(**response.data[0])


async def delete_item(db: Client, user_id: str, item_id: str) -> None:
    """Delete an item."""
    response = (
        db.table(TABLE_NAME)
        .delete()
        .eq("id", item_id)
        .eq("user_id", user_id)
        .execute()
    )
    
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
