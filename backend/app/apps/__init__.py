"""
App registry for auto-discovering and registering modular apps.

To create a new app:
1. Create a new folder in apps/ (e.g., apps/notes/)
2. Add router.py with an APIRouter named `router`
3. The app will be auto-registered on startup

Example structure:
    apps/
        notes/
            __init__.py
            router.py    # Must export `router: APIRouter`
            models.py    # Pydantic schemas
            service.py   # Business logic
"""
import importlib
import pkgutil
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastapi import FastAPI


# Apps to exclude from auto-registration
EXCLUDED_APPS = {"_template"}


def discover_apps() -> list[str]:
    """Discover all app modules in the apps directory."""
    apps_dir = Path(__file__).parent
    apps = []
    
    for item in apps_dir.iterdir():
        if (
            item.is_dir()
            and not item.name.startswith("_")
            and item.name not in EXCLUDED_APPS
            and (item / "router.py").exists()
        ):
            apps.append(item.name)
    
    return apps


def register_all_apps(app: "FastAPI") -> None:
    """
    Auto-discover and register all app routers.
    
    Each app module must have a router.py file that exports
    an APIRouter instance named `router`.
    """
    discovered_apps = discover_apps()
    
    for app_name in discovered_apps:
        try:
            module = importlib.import_module(f"app.apps.{app_name}.router")
            router = getattr(module, "router", None)
            
            if router:
                # Get prefix from module or default to app name
                prefix = getattr(module, "PREFIX", f"/api/{app_name}")
                tags = getattr(module, "TAGS", [app_name.title()])
                
                app.include_router(router, prefix=prefix, tags=tags)
                print(f"✓ Registered app: {app_name} at {prefix}")
            else:
                print(f"✗ No router found in {app_name}/router.py")
                
        except Exception as e:
            print(f"✗ Failed to register {app_name}: {e}")


# Message handlers for Poke integration
# Apps can register handlers for specific message patterns
_message_handlers: dict[str, callable] = {}


def register_message_handler(pattern: str, handler: callable) -> None:
    """
    Register a message handler for Poke integration.
    
    Args:
        pattern: A keyword or pattern to match incoming messages
        handler: Async function(message: str, user_id: str) -> str
    
    Example:
        @register_message_handler("note")
        async def handle_note(message: str, user_id: str) -> str:
            # Process note command
            return "Note saved!"
    """
    _message_handlers[pattern.lower()] = handler


def get_message_handlers() -> dict[str, callable]:
    """Get all registered message handlers."""
    return _message_handlers.copy()
