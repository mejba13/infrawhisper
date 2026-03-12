from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    port: int = 8001
    env: str = "development"

    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-20250514"
    claude_max_tokens: int = 4096

    clickhouse_host: str = "localhost"
    clickhouse_port: int = 9000
    clickhouse_database: str = "infrawhisper"
    clickhouse_user: str = "default"
    clickhouse_password: str = ""

    api_url: str = "http://localhost:8080"


@lru_cache
def get_settings() -> Settings:
    return Settings()
