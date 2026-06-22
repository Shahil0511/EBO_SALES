"""SalesRepository — all aggregation SQL over `olabi_sales`.

Methods return small, typed *domain* result objects (the dataclasses below), NOT
Pydantic/wire models — keeping this layer independent of the API. The service layer
(M9) turns these into response DTOs and computes period-over-period deltas.

Conventions enforced here (from backend/docs/SPEC.md):
  * money columns are REAL/float → always summed as `cast(col, Numeric(14, 2))`;
  * returns are rows where `total_sales_qty < 0`; gross excludes them;
  * every query carries the `invoice_date` range so TimescaleDB prunes chunks;
  * date bounds are `date`/`datetime` objects (never strings) — half-open [from, to).
"""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Literal

from sqlalchemy import Numeric, cast, distinct, func, select, text
from sqlalchemy.orm import InstrumentedAttribute

from app.models import EboStoreMaster, OlabiSales
from app.repositories.base import BaseRepository

# Bucket sizes we allow for the trend. A whitelist → safe to inline as an interval.
TrendBucket = Literal["day", "week"]
_BUCKET_INTERVAL: dict[TrendBucket, str] = {"day": "1 day", "week": "1 week"}

# The dimensions a breakdown can group by. This vocabulary is owned by the data layer
# because each value maps to a concrete GROUP BY column (see _DIMENSIONS below).
BreakdownDimension = Literal[
    "store", "category", "brand", "channel", "salesperson", "region", "city", "cluster"
]


@dataclass(frozen=True, slots=True)
class _DimSpec:
    """How to group by one dimension: the column, whether it needs the store-master
    join, and whether blank labels (e.g. EC salesperson) should be excluded."""

    column: InstrumentedAttribute[str | None]
    needs_store_join: bool = False
    exclude_blank: bool = False


# Dimension → grouping column. Store/category/brand/channel/salesperson come straight
# from the fact; region/city/cluster require the LEFT JOIN to ebo_store_master.
_DIMENSIONS: dict[BreakdownDimension, _DimSpec] = {
    "store": _DimSpec(OlabiSales.invoice_associate_name),
    "category": _DimSpec(OlabiSales.category_name),
    "brand": _DimSpec(OlabiSales.brand_name),
    "channel": _DimSpec(OlabiSales.business_channel_code),
    "salesperson": _DimSpec(OlabiSales.sales_person_name, exclude_blank=True),  # excludes EC
    "region": _DimSpec(EboStoreMaster.region, needs_store_join=True),
    "city": _DimSpec(EboStoreMaster.city, needs_store_join=True),
    "cluster": _DimSpec(EboStoreMaster.cluster, needs_store_join=True),
}


@dataclass(frozen=True, slots=True)
class SummaryRow:
    """Raw KPI measures for a window (report-ready magnitudes; positives for returns)."""

    net_revenue: Decimal
    gross_sales: Decimal
    returns_value: Decimal
    units_sold: Decimal
    units_returned: Decimal
    invoices: int
    customers: int
    discount_value: Decimal  # service derives discount_rate = discount / mrp
    mrp_value: Decimal


@dataclass(frozen=True, slots=True)
class TrendPoint:
    """One bucket of the revenue trend."""

    bucket: datetime
    net_revenue: Decimal
    units: Decimal


@dataclass(frozen=True, slots=True)
class BreakdownRow:
    """One group of a dimensional breakdown (label may be NULL → 'Unknown' upstream)."""

    label: str | None
    net_revenue: Decimal
    units: Decimal


class SalesRepository(BaseRepository):
    """Read-only aggregations over the olabi_sales fact table."""

    async def summary(self, date_from: datetime, date_to: datetime) -> SummaryRow:
        """All headline KPI measures for the half-open window [date_from, date_to).

        Single round-trip: the gross/returns split is done with `FILTER (WHERE ...)`
        aggregates rather than separate queries.
        """
        qty = OlabiSales.total_sales_qty
        nett = cast(OlabiSales.nett_invoice_value, Numeric(14, 2))
        disc = cast(OlabiSales.invoice_discount_value, Numeric(14, 2))
        mrp = cast(OlabiSales.invoice_mrp_value, Numeric(14, 2))

        stmt = select(
            func.coalesce(func.sum(nett), 0).label("net_revenue"),
            func.coalesce(func.sum(nett).filter(qty >= 0), 0).label("gross_sales"),
            func.coalesce(-func.sum(nett).filter(qty < 0), 0).label("returns_value"),
            func.coalesce(func.sum(qty).filter(qty >= 0), 0).label("units_sold"),
            func.coalesce(-func.sum(qty).filter(qty < 0), 0).label("units_returned"),
            func.count(distinct(OlabiSales.invoice_no)).label("invoices"),
            func.count(distinct(OlabiSales.consumer_mobile)).label("customers"),
            func.coalesce(func.sum(disc), 0).label("discount_value"),
            func.coalesce(func.sum(mrp), 0).label("mrp_value"),
        ).where(
            OlabiSales.invoice_date >= date_from,
            OlabiSales.invoice_date < date_to,
        )

        row = (await self.session.execute(stmt)).one()
        return SummaryRow(
            net_revenue=row.net_revenue,
            gross_sales=row.gross_sales,
            returns_value=row.returns_value,
            units_sold=row.units_sold,
            units_returned=row.units_returned,
            invoices=row.invoices,
            customers=row.customers,
            discount_value=row.discount_value,
            mrp_value=row.mrp_value,
        )

    async def revenue_trend(
        self, date_from: datetime, date_to: datetime, bucket: TrendBucket
    ) -> list[TrendPoint]:
        """Net revenue + units per `day`/`week` bucket (TimescaleDB `time_bucket`)."""
        qty = OlabiSales.total_sales_qty
        nett = cast(OlabiSales.nett_invoice_value, Numeric(14, 2))
        # `bucket` is a whitelisted key, so the interval literal is safe to inline.
        bucket_expr = func.time_bucket(
            text(f"interval '{_BUCKET_INTERVAL[bucket]}'"), OlabiSales.invoice_date
        )

        stmt = (
            select(
                bucket_expr.label("bucket"),
                func.coalesce(func.sum(nett), 0).label("net_revenue"),
                func.coalesce(func.sum(qty), 0).label("units"),
            )
            .where(
                OlabiSales.invoice_date >= date_from,
                OlabiSales.invoice_date < date_to,
            )
            .group_by(bucket_expr)
            .order_by(bucket_expr)
        )

        rows = (await self.session.execute(stmt)).all()
        return [
            TrendPoint(bucket=r.bucket, net_revenue=r.net_revenue, units=r.units)
            for r in rows
        ]

    async def revenue_by_dimension(
        self, date_from: datetime, date_to: datetime, dimension: BreakdownDimension
    ) -> list[BreakdownRow]:
        """Net revenue + units grouped by one dimension, ordered high→low.

        Returns ALL groups (the service slices top-N and computes share against the
        full total). For region/city/cluster it LEFT JOINs `ebo_store_master`, so the
        ~4 stores with no master row group under a NULL label rather than vanishing.
        """
        spec = _DIMENSIONS[dimension]
        label = spec.column
        nett = cast(OlabiSales.nett_invoice_value, Numeric(14, 2))
        qty = OlabiSales.total_sales_qty
        net_sum = func.coalesce(func.sum(nett), 0)

        stmt = (
            select(
                label.label("label"),
                net_sum.label("net_revenue"),
                func.coalesce(func.sum(qty), 0).label("units"),
            )
            .select_from(OlabiSales)  # anchor FROM to the fact, even for joined dims
            .where(OlabiSales.invoice_date >= date_from, OlabiSales.invoice_date < date_to)
        )
        if spec.needs_store_join:
            stmt = stmt.join(
                EboStoreMaster,
                OlabiSales.invoice_associate_code == EboStoreMaster.store_code,
                isouter=True,
            )
        if spec.exclude_blank:  # salesperson: drop EC's blank staff
            stmt = stmt.where(label.isnot(None), label != "")

        stmt = stmt.group_by(label).order_by(net_sum.desc())

        rows = (await self.session.execute(stmt)).all()
        return [
            BreakdownRow(label=r.label, net_revenue=r.net_revenue, units=r.units)
            for r in rows
        ]
