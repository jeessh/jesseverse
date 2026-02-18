"""Service layer for Poke integration."""
import hashlib
import hmac
from typing import Callable

from .models import PokeWebhookPayload


def verify_signature(
    payload: PokeWebhookPayload,
    signature: str,
    secret: str,
) -> bool:
    """
    Verify the webhook signature from Poke.
    
    Adjust this based on Poke's actual signature format.
    """
    # Common pattern: HMAC-SHA256 of the payload
    message = f"{payload.phone_number}:{payload.message}"
    expected = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected)


async def route_message(
    message: str,
    phone_number: str,
    handlers: dict[str, Callable],
) -> str:
    """
    Route an incoming message to the appropriate handler.
    
    Matches the first word of the message to registered handlers.
    """
    # Parse command from message
    parts = message.strip().split(maxsplit=1)
    command = parts[0].lower() if parts else ""
    args = parts[1] if len(parts) > 1 else ""
    
    # Find matching handler
    if command in handlers:
        handler = handlers[command]
        try:
            return await handler(args, phone_number)
        except Exception as e:
            return f"Error processing '{command}': {str(e)}"
    
    # Default response when no handler matches
    available = ", ".join(handlers.keys()) if handlers else "none"
    return (
        f"Unknown command: '{command}'\n"
        f"Available commands: {available}\n"
        f"Send 'help' for more info."
    )


async def default_help_handler(message: str, phone_number: str) -> str:
    """Default help handler."""
    return (
        "Welcome to Jessiverse!\n"
        "Available commands will appear here as you add apps.\n"
        "Each app can register its own commands."
    )
