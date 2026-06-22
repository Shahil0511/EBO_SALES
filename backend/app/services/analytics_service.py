"""AnalyticsService — business logic for KPIs, trend, breakdowns, products, transactions.

It maps the Pydantic `AnalyticsFilters` (wire) into a `SalesFilter` (domain) via
`_to_sales_filter`, orchestrates `SalesRepository`, applies the domain rules
(discount_rate, period-over-period deltas, share, unit rounding), and returns DTOs.
No SQL here; no HTTP here.
"""

from dataclasses import replace
from datetime import date, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal

from app.repositories.sales_repository import (
    BreakdownDimension,
    SalesFilter,
    SalesRepository,
    SummaryRow,
    TrendBucket,
)
from app.schemas.analytics import KpiDelta, SummaryResponse
from app.schemas.breakdowns import BreakdownItem, BreakdownResponse
from app.schemas.common import Page
from app.schemas.filters import AnalyticsFilters
from app.schemas.products import ProductCard, ProductDetail, ProductQuery, VariantItem
from app.schemas.transactions import TransactionRowOut, TransactionsQuery
from app.schemas.trends import TrendPointOut, TrendResponse


class AnalyticsService:
    """Turns filters into KPI / trend / breakdown / product / transaction DTOs."""

    def __init__(self, repository: SalesRepository) -> None:
        self.repository = repository

    async def get_summary(self, filters: AnalyticsFilters) -> SummaryResponse:
        """KPI block for the filtered window + deltas vs the previous equal window."""
        flt = _to_sales_filter(filters)
        window = flt.date_to - flt.date_from
        prev = replace(flt, date_from=flt.date_from - window, date_to=flt.date_from)

        current = await self.repository.summary(flt)
        previous = await self.repository.summary(prev)

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
        """Revenue/units time series for the filtered window, bucketed day/week."""
        points = await self.repository.revenue_trend(_to_sales_filter(filters), bucket)
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
        rows = await self.repository.revenue_by_dimension(_to_sales_filter(filters), dimension)

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
        flt = _to_sales_filter(query)
        rows, total = await self.repository.product_ranking(
            flt, query.rank_by, query.page, query.page_size
        )
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
        return Page[ProductCard](
            items=items,
            total=total,
            page=query.page,
            page_size=query.page_size,
            pages=_page_count(total, query.page_size),
        )

    async def get_product_detail(
        self, filters: AnalyticsFilters, product_code: str
    ) -> ProductDetail:
        """One product with its per-variant breakdown over the filtered window.

        The product multiselect is cleared (`products=()`) so drilling into a code is not
        accidentally filtered out by a products filter still in the URL.
        """
        flt = replace(_to_sales_filter(filters), products=())
        variants = await self.repository.product_variants(flt, product_code)
        images = await self.repository.product_images([product_code])

        return ProductDetail(
            product_code=product_code,
            image_url=images.get(product_code),
            variant_count=len(variants),
            net_revenue=sum((float(v.net_revenue) for v in variants), 0.0),
            units=sum((_to_units(v.units) for v in variants), 0),
            variants=[
                VariantItem(sku=v.sku, net_revenue=float(v.net_revenue), units=_to_units(v.units))
                for v in variants
            ],
        )

    async def get_transactions(self, query: TransactionsQuery) -> Page[TransactionRowOut]:
        """One filtered, sorted, paginated page of raw line items for the table."""
        flt = _to_sales_filter(query)
        rows, total = await self.repository.transactions(
            flt, query.page, query.page_size, query.sort_key, query.sort_dir
        )
        items = [
            TransactionRowOut(
                invoice_date=r.invoice_date,
                invoice_no=r.invoice_no,
                product_code=r.product_code,
                sku=r.sku,
                store=r.store,
                channel=r.channel,
                category=r.category,
                brand=r.brand,
                qty=_to_units(r.qty),
                mrp=float(r.mrp or 0.0),
                discount=float(r.discount or 0.0),
                net=float(r.net or 0.0),
                salesperson=r.salesperson,
                customer=r.customer,
                mobile=r.mobile,
                first_bill_date=r.first_bill_date,
            )
            for r in rows
        ]
        return Page[TransactionRowOut](
            items=items,
            total=total,
            page=query.page,
            page_size=query.page_size,
            pages=_page_count(total, query.page_size),
        )


# ── pure helpers (unit-tested in M16) ────────────────────────────────────────
def _to_sales_filter(filters: AnalyticsFilters) -> SalesFilter:
    """Map the Pydantic wire filter → the repository's domain filter (the one mapping
    point between layers). Inclusive [date_from, date_to] becomes a half-open datetime
    window; multiselect lists become tuples."""
    date_from, date_to = _day_bounds(filters.date_from, filters.date_to)
    return SalesFilter(
        date_from=date_from,
        date_to=date_to,
        stores=tuple(filters.stores),
        brands=tuple(filters.brands),
        categories=tuple(filters.categories),
        channels=tuple(filters.channels),
        salespersons=tuple(filters.salespersons),
        products=tuple(filters.products),
        qty_min=filters.qty_min,
        qty_max=filters.qty_max,
        search=filters.search,
    )


def _day_bounds(date_from: date, date_to: date) -> tuple[datetime, datetime]:
    """Inclusive [date_from, date_to] (dates) → half-open [start, end) (datetimes)."""
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


def _to_units(value: Decimal) -> int:
    """Quantities are NUMERIC (Decimal); round to a whole count consistently everywhere
    so a fractional sum never 500s a response nor silently truncates differently."""
    return int(value.to_integral_value(rounding=ROUND_HALF_UP))


def _page_count(total: int, page_size: int) -> int:
    return (total + page_size - 1) // page_size if total else 0
