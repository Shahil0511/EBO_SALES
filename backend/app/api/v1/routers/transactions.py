"""Transactions route — the paginated, sortable line-item table.

GET /api/v1/transactions → Page[TransactionRowOut], honoring the shared filters
plus page / pageSize / sortKey / sortDir.
"""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_analytics_service
from app.schemas.common import Page
from app.schemas.invoices import InvoiceDetailResponse
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


@router.get("/invoice/{invoice_no}", response_model=InvoiceDetailResponse)
async def get_invoice_detail(
    invoice_no: str,
    date_from: Annotated[date, Query(alias="dateFrom")],
    date_to: Annotated[date, Query(alias="dateTo")],
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    store: Annotated[str | None, Query()] = None,
) -> InvoiceDetailResponse:
    """Every line item of one invoice, scoped to a date window so chunks are pruned.
    Optional `store` (associate name) disambiguates reused POS invoice numbers."""
    return await service.get_invoice_detail(invoice_no, date_from, date_to, store)
