"""Configuration settings for MolLens"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "MolLens"
    
    # Server Settings
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS Settings
    BACKEND_CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:8080"]
    
    # Molecular Processing
    OPTIMIZATION_METHODS: list = ["mmff94", "uff"]
    DEFAULT_OPTIMIZATION: str = "mmff94"
    
    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
