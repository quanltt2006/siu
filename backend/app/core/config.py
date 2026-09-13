"""Application configuration"""
from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # LLM
    LLM_PROVIDER: str = "openai"
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-haiku-20240307"
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/smart_csv.db"
    
    # ChromaDB
    CHROMA_PERSIST_DIR: str = "./data/chroma"
    
    # File Upload
    MAX_FILE_SIZE_MB: int = 50
    UPLOAD_DIR: str = "./data/uploads"
    
    # Sandbox
    SANDBOX_TIMEOUT_SECONDS: int = 30
    SANDBOX_MAX_MEMORY_MB: int = 256
    
    # Security
    SECRET_KEY: str = "change-this-to-a-random-secret-key"
    API_KEY_HEADER: str = "X-API-Key"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
os.makedirs("./data", exist_ok=True)
