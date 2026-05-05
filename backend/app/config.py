from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://querylens:querylens@db:5432/querylens"
    MIN_MEAN_MS: float = 0.1
    ALLOW_EXPLAIN_ANALYZE: bool = False
    EXPLAIN_TIMEOUT_MS: int = 5000

    LLM_ENABLED: bool = False
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"

    CORS_ORIGINS: str = "http://localhost:3030"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
