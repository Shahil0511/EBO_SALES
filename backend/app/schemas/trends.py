"""Response DTOs for the revenue-trend endpoint (GET /api/v1/analytics/trend)."""

from datetime import date
from typing import Literal

from app.schemas.common import APIModel


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
