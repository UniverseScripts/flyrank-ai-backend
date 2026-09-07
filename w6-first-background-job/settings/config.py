from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    INNGEST_DEV: bool = True

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

settings = Settings()
