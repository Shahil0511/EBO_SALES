"""Store-performance routes — fast reads over prebuilt aggregates.

GET /api/v1/stores/leaderboard → current-month MTD KPIs for every store. Reads the 52-row
`ebo_mtd_performance` snapshot directly, so it returns in well under a second.
"""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_store_service
from app.schemas.stores import StoreLeaderboardResponse
from app.services.store_service import StoreService

router = APIRouter(prefix="/stores", tags=["stores"])


@router.get("/leaderboard", response_model=StoreLeaderboardResponse)
async def get_store_leaderboard(
    service: Annotated[StoreService, Depends(get_store_service)],
) -> StoreLeaderboardResponse:
    """Every store's month-to-date KPIs (sale, projection, ATV/ASP/basket, discount%, WoW),
    ranked by MTD sale."""
    return await service.get_leaderboard()
