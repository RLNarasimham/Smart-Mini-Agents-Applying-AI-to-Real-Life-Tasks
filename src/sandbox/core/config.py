# aio_sandbox_service/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SANDBOX_IMAGE: str = "ghcr.io/agent-infra/sandbox:1.0.0.126"
    BASE_PORT: int = 9000
    MAX_SESSIONS: int = 100
    SESSION_TIMEOUT_MINUTES: int = 30
    
    # Docker resource limits
    MEM_LIMIT: str = "4g"
    CPU_QUOTA: int = 100000  # 1 full CPU core
    SHM_SIZE: str = "1g"

    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

settings = Settings()