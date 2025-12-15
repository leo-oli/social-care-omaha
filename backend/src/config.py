from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )
    ENCRYPTION_KEY: str | None = None
    GO_URL: str | None = None
    GO_USERNAME: str | None = None
    GO_PASSWORD: str | None = None
    GO_NOTEBOOK_ID: str | None = None


settings = Settings()
