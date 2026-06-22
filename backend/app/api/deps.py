"""FastAPI dependency providers — the DI graph for a request.

The object graph is composed top-down by FastAPI:
    get_db (AsyncSession)  →  get_sales_repository (SalesRepository)  →
    get_analytics_service (AnalyticsService)

A route declares `Depends(get_analytics_service)` and receives a fully-wired service.
Each provider is a named function, so Ctrl-click shows exactly how a dependency is
built — and in tests you override `get_db` to swap the whole chain onto a test session.
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.sales_repository import SalesRepository
from app.services.analytics_service import AnalyticsService


def get_sales_repository(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> SalesRepository:
    """Provide a SalesRepository bound to the request's session."""
    return SalesRepository(session)


def get_analytics_service(
    repository: Annotated[SalesRepository, Depends(get_sales_repository)],
) -> AnalyticsService:
    """Provide an AnalyticsService wired with its repository."""
    return AnalyticsService(repository)
