import json
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Jesseverse"

    # supabase — single secret key (new supabase api key format)
    supabase_url: str = ""
    supabase_secret_key: str = ""

    # cors origins — comma-separated string or json array (pydantic-settings
    # treats json arrays as objects, so we parse it ourselves)
    cors_origins: str = "http://localhost:3000,https://jesseverse.vercel.app"

    @property
    def cors_origins_list(self) -> list[str]:
        v = self.cors_origins.strip()
        if v.startswith("["):
            return json.loads(v)
        return [o.strip() for o in v.split(",") if o.strip()]

    # api key for extension write endpoints (post, delete, execute) — set in .env
    api_key: str = "change-me"

    # bearer token for the mcp endpoint — set in .env
    mcp_token: str = "change-me"

    # public url of this server (used in mcp auth metadata)
    server_url: str = "https://jesseverse-backend.vercel.app"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
