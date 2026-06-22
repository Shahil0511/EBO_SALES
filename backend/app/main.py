


from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import api_router
from app.db.engine import engine


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """App lifespan: code before `yield` runs at startup, after it at shutdown.

    On shutdown we `dispose()` the engine so the asyncpg connection pool is drained
    gracefully (avoids 'event loop closed' / pending-task warnings on uvicorn --reload
    and SIGTERM). This is the standard SQLAlchemy-async + FastAPI lifecycle pattern.
    """
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    """Build, configure, and return the FastAPI application."""
    app = FastAPI(title="LIBAS Sales Intelligence API", lifespan=lifespan)
    app.include_router(api_router)
    return app



app = create_app()
