"""Filter-support routes — option lists and the cascading staff filter
(GET /api/v1/filters/options, GET /api/v1/filters/salespeople)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_analytics_service
from app.schemas.filters import AnalyticsFilters
from app.schemas.filters_options import FilterOptionsResponse, SalespersonsResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/filters", tags=["filters"])


@router.get("/options", response_model=FilterOptionsResponse)
async def filter_options(
    filters: Annotated[AnalyticsFilters, Query()],
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> FilterOptionsResponse:
    """Selectable values for stores / brands / categories / channels in the window."""
    return await service.get_filter_options(filters)


@router.get("/salespeople", response_model=SalespersonsResponse)
async def salespeople(
    filters: Annotated[AnalyticsFilters, Query()],
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> SalespersonsResponse:
    """Cascade: staff with sales in the selected store(s); empty for EC-only."""
    return await service.get_salespersons(filters)
