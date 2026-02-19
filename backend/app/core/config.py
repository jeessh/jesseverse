from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Jesseverse"

    # Supabase — single secret key (new Supabase API key format)
    supabase_url: str = ""
    supabase_secret_key: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "https://jesseverse.vercel.app"]

    # API key that protects the extension registry write endpoints (POST, DELETE, execute).
    # Set this in .env — only you need it.
    api_key: str = "change-me"

    # A single static bearer token that protects the MCP endpoint.
    # Set this in .env — only you need it.
    mcp_token: str = "change-me"

    # Public URL of this server (used in MCP auth metadata)
    server_url: str = "https://jesseverse-backend.vercel.app"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
