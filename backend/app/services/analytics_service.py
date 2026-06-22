"""AnalyticsService — business logic for the KPI summary and the revenue trend.

Owns the rules the prototype encoded (SPEC §3): `discount_rate`, and period-over-period
deltas vs the **previous equal-length window**. It orchestrates `SalesRepository` and
returns response DTOs. No SQL here; no HTTP here.

Navigability: `get_summary` → `repository.summary()` → the `select()` → `OlabiSales`.
"""

from datetime import date, datetime, time, timedelta
from decimal import Decimal

from app.repositories.sales_repository import SalesRepository, SummaryRow, TrendBucket
from app.schemas.analytics import KpiDelta, SummaryResponse
from app.schemas.filters import AnalyticsFilters
from app.schemas.trends import TrendPointOut, TrendResponse


class AnalyticsService:
    """Turns an `AnalyticsFilters` into KPI / trend response DTOs."""

    def __init__(self, repository: SalesRepository) -> None:
        self.repository = repository

    async def get_summary(self, filters: AnalyticsFilters) -> SummaryResponse:
        """KPI block for the selected window + deltas vs the previous equal window."""
        cur_from, cur_to = _day_bounds(filters.date_from, filters.date_to)
        # Previous window: same length, immediately before the current one.
        window = cur_to - cur_from
        prev_from, prev_to = cur_from - window, cur_from

        current = await self.repository.summary(cur_from, cur_to)
        previous = await self.repository.summary(prev_from, prev_to)

        return SummaryResponse(
            net_revenue=float(current.net_revenue),
            gross_sales=float(current.gross_sales),
            returns_value=float(current.returns_value),
            units_sold=int(current.units_sold),
            units_returned=int(current.units_returned),
            invoices=current.invoices,
            customers=current.customers,
            discount_rate=_discount_rate(current),
            net_revenue_delta=_delta(current.net_revenue, previous.net_revenue),
            invoices_delta=_delta(current.invoices, previous.invoices),
        )

    async def get_trend(self, filters: AnalyticsFilters, bucket: TrendBucket) -> TrendResponse:
        """Revenue/units time series for the selected window, bucketed day/week."""
        cur_from, cur_to = _day_bounds(filters.date_from, filters.date_to)
        points = await self.repository.revenue_trend(cur_from, cur_to, bucket)
        return TrendResponse(
            bucket=bucket,
            points=[TrendPointOut.model_validate(p) for p in points],
        )


# ── pure helpers (easy to unit-test in M16) ──────────────────────────────────
def _day_bounds(date_from: date, date_to: date) -> tuple[datetime, datetime]:
    """Inclusive [date_from, date_to] (dates) → half-open [start, end) (datetimes).

    `date_to` is made inclusive by ending at the *start of the next day*, which is
    exactly what the repository's `invoice_date < end` expects.
    """
    start = datetime.combine(date_from, time.min)
    end = datetime.combine(date_to + timedelta(days=1), time.min)
    return start, end


def _discount_rate(row: SummaryRow) -> float:
    """discount / mrp * 100, guarded against divide-by-zero (empty window)."""
    if row.mrp_value == 0:
        return 0.0
    return float(row.discount_value / row.mrp_value * 100)


def _delta(current: float | int | Decimal, previous: float | int | Decimal) -> KpiDelta:
    """Period-over-period change. `pct_change` is None when there is no prior base."""
    cur, prev = float(current), float(previous)
    pct_change = None if prev == 0 else (cur - prev) / abs(prev) * 100
    return KpiDelta(current=cur, previous=prev, pct_change=pct_change)
