from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Jessiverse"

    # Supabase — single secret key (new Supabase API key format)
    supabase_url: str = ""
    supabase_secret_key: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # A single static bearer token that protects the MCP endpoint.
    # Set this in .env — only you need it.
    mcp_token: str = "change-me"

    # Public URL of this server (used in MCP auth metadata)
    server_url: str = "http://localhost:8000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
