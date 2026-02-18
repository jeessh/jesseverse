"""Application configuration using pydantic-settings."""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App
    app_name: str = "Jessiverse"
    debug: bool = False
    
    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    
    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]
    
    # Poke Integration
    poke_webhook_secret: str = ""
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
