"""Response DTOs for the KPI summary endpoint (GET /api/v1/analytics/summary).

Money is exposed as `float` (rounded amounts for display); the precision-sensitive
work — summing the source's REAL columns as Numeric — already happened in the
repository, so the final scalar is safe to surface as a number.
"""

from app.schemas.common import APIModel


class KpiDelta(APIModel):
    """Period-over-period change for one metric (vs the previous equal-length window)."""

    current: float
    previous: float | None = None
    pct_change: float | None = None  # e.g. 14.0 == +14.0%


class SummaryResponse(APIModel):
    """The KPI block (SPEC §3). Deltas are attached for the headline metrics."""

    net_revenue: float
    gross_sales: float
    returns_value: float
    units_sold: int
    units_returned: int
    invoices: int
    customers: int
    discount_rate: float  # percent, e.g. 49.0

    net_revenue_delta: KpiDelta | None = None
    invoices_delta: KpiDelta | None = None
