"""Store-performance routes — fast reads over prebuilt aggregates.

GET /api/v1/stores/leaderboard → current-month MTD KPIs for every store. Reads the 52-row
`ebo_mtd_performance` snapshot directly, so it returns in well under a second.
"""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_store_service
from app.repositories.store_repository import HierarchyLevel
from app.schemas.stores import HierarchyResponse, StoreDetailResponse, StoreLeaderboardResponse
from app.services.store_service import StoreService

router = APIRouter(prefix="/stores", tags=["stores"])


@router.get("/leaderboard", response_model=StoreLeaderboardResponse)
async def get_store_leaderboard(
    service: Annotated[StoreService, Depends(get_store_service)],
) -> StoreLeaderboardResponse:
    """Every store's month-to-date KPIs (sale, projection, ATV/ASP/basket, discount%, WoW),
    ranked by MTD sale."""
    return await service.get_leaderboard()


@router.get("/hierarchy/{level}", response_model=HierarchyResponse)
async def get_store_hierarchy(
    level: HierarchyLevel,
    service: Annotated[StoreService, Depends(get_store_service)],
) -> HierarchyResponse:
    """Current-month totals grouped by region / cluster / area-manager / regional-manager."""
    return await service.get_hierarchy(level)


@router.get("/{store_code}", response_model=StoreDetailResponse)
async def get_store_detail(
    store_code: str,
    date_from: Annotated[date, Query(alias="dateFrom")],
    date_to: Annotated[date, Query(alias="dateTo")],
    service: Annotated[StoreService, Depends(get_store_service)],
) -> StoreDetailResponse:
    """One store's detail over [dateFrom, dateTo]: KPIs + daily series + salesperson leaderboard."""
    return await service.get_store_detail(store_code, date_from, date_to)
