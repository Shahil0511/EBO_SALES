"""Breakdown routes — net revenue grouped by one dimension.

`GET /api/v1/breakdowns/{dimension}` where dimension is one of
store | category | brand | channel | salesperson | region | city | cluster.
Because the path param is typed as the `BreakdownDimension` Literal, an unknown
dimension is rejected with 422 before any code runs — no manual validation.

`BreakdownDimension` is imported from the repository: it's the data layer that owns
which columns can be grouped, so it owns the vocabulary of valid dimensions.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_analytics_service
from app.repositories.sales_repository import BreakdownDimension
from app.schemas.breakdowns import BreakdownQuery, BreakdownResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/breakdowns", tags=["breakdowns"])


@router.get("/{dimension}", response_model=BreakdownResponse)
async def get_breakdown(
    dimension: BreakdownDimension,
    query: Annotated[BreakdownQuery, Query()],
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> BreakdownResponse:
    """Top-N groups for `dimension` over the filtered window, with share%."""
    return await service.get_breakdown(query, dimension, query.limit)
