"""Schemas for the store-performance endpoints (GET /api/v1/stores/...)."""

from datetime import date

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
    month_target: float | None = None  # full-month sales target (daily target × days in month)
    achievement_pct: float | None = None  # MTD sale ÷ target-to-date × 100 (None if no target)


class StoreLeaderboardResponse(APIModel):
    """Current-month store leaderboard, ranked by MTD sale."""

    as_of: date | None = None  # latest day present in the matview (data freshness)
    items: list[StoreMtdRow]


class StoreDayPoint(APIModel):
    """One day of a store's series."""

    bucket: date
    nsv: float
    bill_cnt: int
    qty: float
    returns: float


class StorePersonRow(APIModel):
    """One salesperson's totals within a store."""

    code: str
    name: str | None
    nsv: float
    bill_cnt: int
    qty: float
    atv: float


class StoreDetailResponse(APIModel):
    """One store's detail for the selected window: header + KPIs + daily series + staff."""

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
    nsv: float
    gsv: float
    mrp: float
    discount: float
    disc_pct: float
    bill_cnt: int
    qty: float
    returns: float
    atv: float
    asp: float
    basket: float
    op_day: int
    avg_sale: float
    month_target: float | None = None  # this month's full target (None if no target)
    achievement_pct: float | None = None  # this month's MTD sale ÷ target-to-date × 100
    trend: list[StoreDayPoint]
    salespeople: list[StorePersonRow]


class SalespersonStoreOut(APIModel):
    """One store a salesperson sells at, with their NSV/bills there."""

    store_code: str
    store_name: str | None
    nsv: float
    bill_cnt: int


class SalespersonProductOut(APIModel):
    """One of a salesperson's top products."""

    product_code: str
    image_url: str | None = None
    nsv: float
    qty: int


class SalespersonDetailResponse(APIModel):
    """One salesperson's detail: identity + KPIs + daily trend + their stores + top products."""

    code: str
    name: str | None
    region: str | None
    store_manager: str | None
    primary_store: str | None
    store_count: int
    nsv: float
    gsv: float
    mrp: float
    discount: float
    disc_pct: float
    bill_cnt: int
    qty: float
    returns: float
    atv: float
    asp: float
    basket: float
    op_day: int
    avg_sale: float
    trend: list[StoreDayPoint]
    stores: list[SalespersonStoreOut]
    top_products: list[SalespersonProductOut]


class HierarchyRow(APIModel):
    """One hierarchy group (region / cluster / a manager) rolled up across its stores."""

    label: str
    nsv: float
    bill_cnt: int
    qty: float
    store_count: int
    atv: float


class HierarchyResponse(APIModel):
    level: str
    as_of: date | None = None
    items: list[HierarchyRow]
