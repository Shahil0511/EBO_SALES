"""Global search route (GET /api/v1/search)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_analytics_service
from app.schemas.search import SearchQuery, SearchResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResponse)
async def search(
    query: Annotated[SearchQuery, Query()],
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> SearchResponse:
    """Typeahead hits across product code / SKU / invoice, within the date window."""
    return await service.search(query)
