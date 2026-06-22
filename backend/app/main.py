


from fastapi import FastAPI

from app.api.v1.router import api_router


def create_app() -> FastAPI:
    """Build, configure, and return the FastAPI application."""
    app = FastAPI(title="LIBAS Sales Intelligence API")
    app.include_router(api_router)
    return app



app = create_app()
