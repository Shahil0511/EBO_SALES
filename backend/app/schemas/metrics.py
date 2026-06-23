"""Schemas for the KPI drill-down endpoint (GET /api/v1/analytics/metrics/{metric}).

One generic payload powers every metric's detail page: the headline value + delta, the
metric over time, and the metric sliced by each dimension. `unit` tells the client how to
format the numbers (₹ / count / %)."""

from datetime import date
from typing import Literal

from app.schemas.analytics import KpiDelta
from app.schemas.common import APIModel

MetricUnit = Literal["currency", "number", "percent"]


class MetricPointOut(APIModel):
    """One time bucket of the metric (day granularity)."""

    bucket: date
    value: float


class MetricBreakdownItem(APIModel):
    """One dimension group's value for this metric, with its share of the dimension total.
    `share` is None for non-additive metrics (distinct counts / ratios), where a share% would
    be misleading; the client omits the annotation when it is null."""

    label: str
    value: float
    share: float | None = None


class MetricBreakdownGroup(APIModel):
    """This metric grouped by one dimension (store / category / brand / channel …)."""

    dimension: str
    items: list[MetricBreakdownItem]


class MetricDetailResponse(APIModel):
    """Everything a single metric's detail page needs."""

    metric: str
    label: str
    unit: MetricUnit
    value: float
    delta: KpiDelta | None = None
    trend: list[MetricPointOut]
    breakdowns: list[MetricBreakdownGroup]
