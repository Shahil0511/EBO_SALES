"""Analytics routes — KPI summary and revenue trend.

Thin controllers: each does exactly three things — declare its contract
(`response_model` + the `AnalyticsFilters` query model), resolve dependencies
(`Depends`), and call ONE service method. No business logic, no SQL.

`AnalyticsFilters` is bound from the query string via `Query()`; because the model
uses camelCase aliases, the params are `?dateFrom=…&dateTo=…&stores=…&qtyMin=…`.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_analytics_service
from app.repositories.sales_repository import MetricKey
from app.schemas.analytics import SummaryResponse
from app.schemas.filters import AnalyticsFilters
from app.schemas.metrics import MetricDetailResponse
from app.schemas.trends import TrendQuery, TrendResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=SummaryResponse)
async def get_summary(
    filters: Annotated[AnalyticsFilters, Query()],
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> SummaryResponse:
    """KPI block + period-over-period deltas for the filtered window."""
    return await service.get_summary(filters)


@router.get("/trend", response_model=TrendResponse)
async def get_trend(
    query: Annotated[TrendQuery, Query()],
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> TrendResponse:
    """Revenue/units time series, bucketed by `day` (default) or `week`.

    `query` is a `TrendQuery` (an `AnalyticsFilters` + `bucket`), so it doubles as the
    filters object passed to the service.
    """
    return await service.get_trend(query, query.bucket)


@router.get("/metrics/{metric}", response_model=MetricDetailResponse)
async def get_metric_detail(
    metric: MetricKey,
    filters: Annotated[AnalyticsFilters, Query()],
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> MetricDetailResponse:
    """Full drill-down for one KPI: its value + delta, day trend, and dimension breakdowns.

    `metric` is typed as the `MetricKey` Literal, so an unknown metric is rejected with 422
    before any code runs (same self-validating pattern as `/breakdowns/{dimension}`).
    """
    return await service.get_metric_detail(filters, metric)
