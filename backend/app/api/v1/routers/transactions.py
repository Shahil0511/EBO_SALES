"""Transactions route — the paginated, sortable line-item table.

GET /api/v1/transactions → Page[TransactionRowOut], honoring the shared filters
plus page / pageSize / sortKey / sortDir.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_analytics_service
from app.schemas.common import Page
from app.schemas.transactions import TransactionRowOut, TransactionsQuery
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=Page[TransactionRowOut])
async def list_transactions(
    query: Annotated[TransactionsQuery, Query()],
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> Page[TransactionRowOut]:
    """Filtered, sorted, paginated line items."""
    return await service.get_transactions(query)
