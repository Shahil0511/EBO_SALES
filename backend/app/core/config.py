"""Application configuration — typed, validated, loaded once at startup.

Mental model (JS): this is `@nestjs/config` + a Zod schema over `process.env`.
`Settings` declares every config value with a type; pydantic-settings reads them
from the environment / `.env`, coerces types, and *validates at boot*. A missing
or malformed value raises immediately when the app starts — never silently at
request time.

Usage everywhere else in the app:
    from app.core.config import get_settings
    settings = get_settings()          # cached singleton; .env is read only once
"""

from functools import lru_cache
from urllib.parse import quote_plus

from pydantic import Field, SecretStr, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All runtime configuration. Field name `db_host` is filled from env `DB_HOST`
    (matching is case-insensitive), or from the same key in `.env`."""

    # Where/how to load config. `.env` lives next to where we run uvicorn (backend/).
    # `extra="ignore"` means unrelated env vars (PATH, etc.) don't break startup.
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────────────────
    env: str = Field(default="local", description="local | staging | production")
    log_level: str = Field(default="INFO", description="DEBUG | INFO | WARNING | ERROR")

    # ── Unicorn warehouse — READ-ONLY data source ───────────────────────────
    # No defaults on these five: that is deliberate. If any is absent, the app
    # refuses to start. You cannot accidentally boot pointing at "nowhere".
    db_host: str
    db_port: int = 5432
    db_user: str
    db_password: SecretStr            # SecretStr keeps the password out of logs/repr
    db_name: str

    # Connection-pool + safety knobs (tuned in M5). A statement timeout guarantees a
    # runaway analytics query can't hold a connection forever.
    db_pool_size: int = 5
    db_max_overflow: int = 5
    db_statement_timeout_ms: int = 30_000

    @computed_field  # type: ignore[prop-decorator]
    @property
    def database_url(self) -> str:
        """SQLAlchemy **async** DSN for the Unicorn warehouse.

        Uses the `asyncpg` driver (wired in M5). The password is URL-encoded with
        `quote_plus`, which is exactly why the literal `@` in the password becomes
        `%40` — an un-encoded `@` would be misread as the host separator.
        Read-only-ness is NOT in the URL; we enforce it at the session level (M5).
        """
        password = quote_plus(self.db_password.get_secret_value())
        return (
            f"postgresql+asyncpg://{self.db_user}:{password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide `Settings` singleton.

    `@lru_cache` means `Settings()` is constructed once (so `.env` is parsed once)
    and the same object is returned thereafter. Importers call `get_settings()`
    rather than building `Settings()` themselves — one source of truth, and trivially
    overridable in tests.
    """
    return Settings()  # type: ignore[call-arg]  # values come from env/.env, not args
