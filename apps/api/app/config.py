from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ChangeThis API"
    database_url: str = Field(alias="DATABASE_URL")
    session_secret: str = Field(alias="SESSION_SECRET")
    changethis_secret_key: str | None = Field(default=None, alias="CHANGETHIS_SECRET_KEY")
    changethis_cron_secret: str | None = Field(default=None, alias="CHANGETHIS_CRON_SECRET")
    allowed_public_origins: str = Field(default="https://changethis.cra.wallonie.be", alias="ALLOWED_PUBLIC_ORIGINS")
    enable_public_signup: bool = Field(default=True, alias="ENABLE_PUBLIC_SIGNUP")
    session_cookie_name: str = "changethis_internal_session"
    session_ttl_seconds: int = 60 * 60 * 24 * 14
    github_app_id: str | None = Field(default=None, alias="GITHUB_APP_ID")
    github_app_private_key: str | None = Field(default=None, alias="GITHUB_APP_PRIVATE_KEY")
    gitlab_oauth_app_id: str | None = Field(default=None, alias="GITLAB_OAUTH_APP_ID")
    gitlab_oauth_app_secret: str | None = Field(default=None, alias="GITLAB_OAUTH_APP_SECRET")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def public_origins(self) -> set[str]:
        return {origin.strip() for origin in self.allowed_public_origins.split(",") if origin.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
