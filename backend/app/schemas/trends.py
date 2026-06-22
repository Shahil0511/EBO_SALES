"""Schemas for the revenue-trend endpoint (GET /api/v1/analytics/trend)."""

from datetime import date
from typing import Literal

from app.schemas.common import APIModel
from app.schemas.filters import AnalyticsFilters


class TrendQuery(AnalyticsFilters):
    """The trend request: all of `AnalyticsFilters` PLUS the bucket size, as a SINGLE
    query-parameter model.

    Why a single model: FastAPI explodes a Pydantic query-model into individual query
    params only when it is the sole `Query()` param. A separate scalar `bucket=Query()`
    alongside the filters model breaks that, so we fold `bucket` into one model here.
    Because this subclasses `AnalyticsFilters`, the service still receives it as filters.
    """

    bucket: Literal["day", "week"] = "day"


class TrendPointOut(APIModel):
    """One day/week bucket of the trend. Built from a repo `TrendPoint` via
    `from_attributes` (field names line up: bucket / net_revenue / units)."""

    bucket: date
    net_revenue: float
    units: int


class TrendResponse(APIModel):
    """The trend series plus which bucket size produced it."""

    bucket: Literal["day", "week"]
    points: list[TrendPointOut]
