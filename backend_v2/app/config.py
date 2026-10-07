"""
Configuration module for Backend v2.
Uses pydantic-settings for environment variable management.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = "" # Service Role Secret for Admin actions
    
    # Apify
    APIFY_TOKEN: str = ""
    
    # Gemini
    # Gemini
    GEMINI_API_KEY: str = ""
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    
    # ComfyUI / RunPod
    COMFYUI_HOST: str = "localhost"
    COMFYUI_PORT: int = 8188
    RUNPOD_POD_ID: str = "" 
    RUNPOD_API_KEY: str = ""
    IMAGE_PROVIDER: str = "dalle"  # dalle, comfyui
    
    # Server
    PORT: int = 8000

    # Acceso de desarrollo (admin@pixely.pe / token fijo). Apagado salvo que se active a propósito en local.
    DEV_BACKDOOR: bool = False
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
