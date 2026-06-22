"""AnalyticsService — business logic for the KPI summary and the revenue trend.

Owns the rules the prototype encoded (SPEC §3): `discount_rate`, and period-over-period
deltas vs the **previous equal-length window**. It orchestrates `SalesRepository` and
returns response DTOs. No SQL here; no HTTP here.

Navigability: `get_summary` → `repository.summary()` → the `select()` → `OlabiSales`.
"""

from datetime import date, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal

from app.repositories.sales_repository import (
    BreakdownDimension,
    SalesRepository,
    SummaryRow,
    TrendBucket,
)
from app.schemas.analytics import KpiDelta, SummaryResponse
from app.schemas.breakdowns import BreakdownItem, BreakdownResponse
from app.schemas.common import Page
from app.schemas.filters import AnalyticsFilters
from app.schemas.products import ProductCard, ProductDetail, ProductQuery, VariantItem
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
            units_sold=_to_units(current.units_sold),
            units_returned=_to_units(current.units_returned),
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
            points=[
                TrendPointOut(
                    bucket=p.bucket, net_revenue=float(p.net_revenue), units=_to_units(p.units)
                )
                for p in points
            ],
        )

    async def get_breakdown(
        self, filters: AnalyticsFilters, dimension: BreakdownDimension, limit: int
    ) -> BreakdownResponse:
        """Top-`limit` groups of one dimension, with share against the full total."""
        cur_from, cur_to = _day_bounds(filters.date_from, filters.date_to)
        rows = await self.repository.revenue_by_dimension(cur_from, cur_to, dimension)

        total = sum((float(r.net_revenue) for r in rows), 0.0)
        items = [
            BreakdownItem(
                label=r.label if r.label else "Unknown",
                net_revenue=float(r.net_revenue),
                units=_to_units(r.units),
                share=(float(r.net_revenue) / total * 100) if total else 0.0,
            )
            for r in rows[:limit]  # rows arrive already sorted high→low
        ]
        return BreakdownResponse(dimension=dimension, total_net_revenue=total, items=items)

    async def get_products(self, query: ProductQuery) -> Page[ProductCard]:
        """One ranked, paginated page of products, each enriched with its image."""
        cur_from, cur_to = _day_bounds(query.date_from, query.date_to)
        rows, total = await self.repository.product_ranking(
            cur_from, cur_to, query.rank_by, query.page, query.page_size
        )
        # one cheap image lookup for just this page's products
        images = await self.repository.product_images([r.product_code for r in rows])

        items = [
            ProductCard(
                product_code=r.product_code,
                category=r.category or "Uncategorized",
                image_url=images.get(r.product_code),
                variant_count=r.variant_count,
                net_revenue=float(r.net_revenue),
                units=_to_units(r.units),
                returns_units=_to_units(r.returns_units),
            )
            for r in rows
        ]
        pages = (total + query.page_size - 1) // query.page_size if total else 0
        return Page[ProductCard](
            items=items,
            total=total,
            page=query.page,
            page_size=query.page_size,
            pages=pages,
        )

    async def get_product_detail(
        self, filters: AnalyticsFilters, product_code: str
    ) -> ProductDetail:
        """One product with its per-variant breakdown over the filtered window."""
        cur_from, cur_to = _day_bounds(filters.date_from, filters.date_to)
        variants = await self.repository.product_variants(cur_from, cur_to, product_code)
        images = await self.repository.product_images([product_code])

        return ProductDetail(
            product_code=product_code,
            image_url=images.get(product_code),
            variant_count=len(variants),
            net_revenue=sum((float(v.net_revenue) for v in variants), 0.0),
            units=sum((_to_units(v.units) for v in variants), 0),
            variants=[
                VariantItem(
                    sku=v.sku, net_revenue=float(v.net_revenue), units=_to_units(v.units)
                )
                for v in variants
            ],
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


def _to_units(value: Decimal) -> int:
    """Quantities come from a NUMERIC column (Decimal). Round to a whole unit count
    consistently everywhere, so a (theoretically) fractional sum never 500s a response
    (Pydantic rejects fractional Decimal → int) nor silently truncates differently."""
    return int(value.to_integral_value(rounding=ROUND_HALF_UP))


def _delta(current: float | int | Decimal, previous: float | int | Decimal) -> KpiDelta:
    """Period-over-period change. `pct_change` is None when there is no prior base."""
    cur, prev = float(current), float(previous)
    pct_change = None if prev == 0 else (cur - prev) / abs(prev) * 100
    return KpiDelta(current=cur, previous=prev, pct_change=pct_change)
