"""Schemas for the breakdown endpoints (GET /api/v1/breakdowns/{dimension})."""

from pydantic import Field

from app.schemas.common import APIModel
from app.schemas.filters import AnalyticsFilters


class BreakdownQuery(AnalyticsFilters):
    """Filters + how many top rows to return — a single query-parameter model
    (same reason as TrendQuery: avoids the model-Query + scalar-Query conflict)."""

    limit: int = Field(default=10, ge=1, le=100)


class BreakdownItem(APIModel):
    """One group of the breakdown (e.g. one store, one category)."""

    label: str
    net_revenue: float
    units: int
    share: float  # percent of the dimension's full total


class BreakdownResponse(APIModel):
    dimension: str
    total_net_revenue: float  # across ALL groups, so `share` is honest even when limited
    items: list[BreakdownItem]
