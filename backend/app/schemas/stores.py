"""Schemas for the store-performance endpoints (GET /api/v1/stores/...)."""

from app.schemas.common import APIModel


class StoreMtdRow(APIModel):
    """One store's month-to-date performance row for the leaderboard."""

    store_code: str
    store_name: str | None
    store_type: str | None
    region: str | None
    state: str | None
    city: str | None
    cluster: str | None
    store_manager: str | None
    cluster_manager: str | None
    area_manager: str | None
    regional_manager: str | None
    mtd_sale: float
    gross_mrp: float
    disc_pct: float  # percent, e.g. 48.0
    bill_cnt: int
    qty: float
    returns: float
    basket: float  # items per bill
    atv: float  # average transaction value (NSV / bills)
    asp: float  # average selling price (NSV / qty)
    op_day: int  # operating days so far this month
    avg_sale: float  # average sale per operating day
    projection_sale: float  # pace projection for the full month
    wow_bill: int  # this-week bills − prior-week bills
    wow_bill_nsv: float  # this-week NSV


class StoreLeaderboardResponse(APIModel):
    """Current-month store leaderboard, ranked by MTD sale."""

    items: list[StoreMtdRow]
