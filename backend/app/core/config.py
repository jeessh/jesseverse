import json
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Jesseverse"

    # Supabase — single secret key (new Supabase API key format)
    supabase_url: str = ""
    supabase_secret_key: str = ""

    # CORS — stored as a plain string so pydantic-settings doesn't try to
    # JSON-decode it.  Accepts either a comma-separated value or a JSON array.
    cors_origins: str = "http://localhost:3000,https://jesseverse.vercel.app"

    @property
    def cors_origins_list(self) -> list[str]:
        v = self.cors_origins.strip()
        if v.startswith("["):
            return json.loads(v)
        return [o.strip() for o in v.split(",") if o.strip()]

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
