"""Application entrypoint — the `create_app()` factory.

`create_app()` builds and configures a FastAPI instance; the module-level `app` is the
ASGI object Uvicorn serves (`uvicorn app.main:app`).

It wires the cross-cutting machinery in order: configure logging → create the app with a
lifespan (engine disposal on shutdown) → add the request-id/access-log middleware →
register the global exception handlers → mount the versioned router.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.exception_handlers import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import request_context_middleware
from app.db.engine import engine


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup runs before `yield`, shutdown after. We drain the async pool on shutdown
    so connections close gracefully (no event-loop-closed warnings on --reload/SIGTERM)."""
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    """Build, configure, and return the FastAPI application."""
    settings = get_settings()
    configure_logging(level=settings.log_level, json_logs=settings.env != "local")

    app = FastAPI(title="LIBAS Sales Intelligence API", lifespan=lifespan)
    app.middleware("http")(request_context_middleware)
    register_exception_handlers(app)
    app.include_router(api_router)
    return app


app = create_app()
