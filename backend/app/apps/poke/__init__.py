"""Poke integration app."""
from app.apps import register_message_handler
from .service import default_help_handler

# Register the default help handler
register_message_handler("help", default_help_handler)
