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

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


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
    db_password: SecretStr  # SecretStr keeps the password out of logs/repr
    db_name: str

    # Connection-pool + safety knobs (tuned in M5). A statement timeout guarantees a
    # runaway analytics query can't hold a connection forever.
    db_pool_size: int = 5
    db_max_overflow: int = 5
    db_statement_timeout_ms: int = 30_000

    @property
    def database_url(self) -> URL:
        """SQLAlchemy **async** DSN for the Unicorn warehouse (asyncpg driver).

        A plain `@property` — NOT a `@computed_field` — on purpose: a computed_field is
        included in `repr()` and `model_dump()`, which would re-expose the password and
        defeat `SecretStr`'s masking. As a property it is never serialized.

        `URL.create` encodes every component correctly (spaces, '@', ':' …) — safer than
        manual string assembly. Read-only-ness is enforced at the session level (M5),
        not in the URL.
        """
        return URL.create(
            "postgresql+asyncpg",
            username=self.db_user,
            password=self.db_password.get_secret_value(),
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
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
