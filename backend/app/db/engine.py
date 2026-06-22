"""The async SQLAlchemy engine — one per process — connected to Unicorn (READ-ONLY).

The engine owns the connection pool. It is created once at import and shared across
the whole app; you never create an engine per request (that would defeat pooling).
Sessions (see db/session.py) borrow connections from this engine's pool.

Mental model: the engine ~ a `pg.Pool` in Node. Created once, reused everywhere.
"""

from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.core.config import get_settings

_settings = get_settings()

# ── READ-ONLY ENFORCEMENT ────────────────────────────────────────────────────
# We enforce read-only at the Postgres *connection* level, for EVERY pooled
# connection — not in application code (which could forget). asyncpg applies these
# as session parameters the moment each connection is opened:
#   default_transaction_read_only = on  → any INSERT/UPDATE/DELETE/DDL is rejected
#                                         by Postgres itself ("read-only transaction")
#   statement_timeout                   → a runaway analytics query is killed, never
#                                         left holding a connection forever
#   application_name                    → our service is identifiable in
#                                         pg_stat_activity for ops/debugging
_READ_ONLY_SERVER_SETTINGS = {
    "default_transaction_read_only": "on",
    "statement_timeout": str(_settings.db_statement_timeout_ms),
    "application_name": "libas-sales-api",
}

engine: AsyncEngine = create_async_engine(
    _settings.database_url,
    pool_size=_settings.db_pool_size,       # steady-state connections kept open
    max_overflow=_settings.db_max_overflow,  # extra connections allowed under load
    pool_pre_ping=True,                      # verify a connection is alive before use
    pool_recycle=1800,                       # recycle connections older than 30 min
    echo=False,                              # flip to True to log every SQL statement
    connect_args={"server_settings": _READ_ONLY_SERVER_SETTINGS},
)
