"""CSV export route (GET /api/v1/export/transactions.csv).

Returns a StreamingResponse so the filtered rows are sent as they are read from the DB
(server-side cursor) — constant memory regardless of how many rows match.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.api.deps import get_analytics_service
from app.schemas.filters import AnalyticsFilters
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/transactions.csv")
async def export_transactions(
    filters: Annotated[AnalyticsFilters, Query()],
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> StreamingResponse:
    """Stream the currently-filtered line items as a CSV download."""
    filename = (
        f"libas_transactions_{filters.date_from.isoformat()}_{filters.date_to.isoformat()}.csv"
    )
    return StreamingResponse(
        service.stream_transactions_csv(filters),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
