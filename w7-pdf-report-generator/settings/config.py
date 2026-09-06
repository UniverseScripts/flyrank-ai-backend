from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    DB_DRIVER: str = 'sqlite'
    DB_PATH: Path = Path(__file__).resolve().parent.parent / "report.db"
    DB_URL: str | None = None

    @property
    def database_url(self) -> str:
        if self.DB_URL:
            return self.DB_URL
        
        if self.DB_DRIVER == 'sqlite':
            db_abs_path = str(self.DB_PATH.resolve()).replace("\\", "/")
            return f"sqlite+aiosqlite:///{db_abs_path}"


settings = Settings()