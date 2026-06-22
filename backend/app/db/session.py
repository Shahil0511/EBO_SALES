"""Async session factory + the `get_db()` FastAPI dependency.

A Session is the unit of work / the handle repositories run queries through.
Rule: **one session per request.** `get_db()` yields one and guarantees it is closed
(its connection returned to the pool) when the request finishes — success or error.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.engine import engine

# The factory that produces sessions bound to our one engine.
#   expire_on_commit=False → loaded objects stay usable after the unit of work ends
#                            (matters once we map ORM rows in M6; harmless for raw reads)
#   autoflush=False        → we only ever read, so there is nothing to auto-flush
SessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a read-only `AsyncSession`.

    Inject it with `db: AsyncSession = Depends(get_db)`. The `async with` block
    releases the session (and its pooled connection) even if the request raises.
    No `commit()` is needed — the underlying transaction is read-only.
    """
    async with SessionLocal() as session:
        yield session
