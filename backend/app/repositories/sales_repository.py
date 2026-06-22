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
from typing import Any, Literal

from sqlalchemy import ColumnElement, Numeric, cast, distinct, func, select, text
from sqlalchemy.orm import InstrumentedAttribute

from app.models import EboStoreMaster, ItemMaster, OlabiSales
from app.repositories.base import BaseRepository

# Bucket sizes we allow for the trend. A whitelist → safe to inline as an interval.
TrendBucket = Literal["day", "week"]
_BUCKET_INTERVAL: dict[TrendBucket, str] = {"day": "1 day", "week": "1 week"}

# How the product gallery is ranked. Each maps to an aggregate column in product_ranking.
ProductRankBy = Literal["revenue", "units", "returns"]

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


@dataclass(frozen=True, slots=True)
class ProductRankRow:
    """One product in the ranked gallery (image is added later from item_master)."""

    product_code: str
    category: str | None
    net_revenue: Decimal
    units: Decimal
    returns_units: Decimal
    variant_count: int


@dataclass(frozen=True, slots=True)
class VariantRow:
    """One variant (SKU) of a product, for the drill-down."""

    sku: str
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

    async def product_ranking(
        self,
        date_from: datetime,
        date_to: datetime,
        rank_by: ProductRankBy,
        page: int,
        page_size: int,
    ) -> tuple[list[ProductRankRow], int]:
        """One page of products grouped by `product_code`, ranked by the chosen metric.

        Returns (page rows, total group count). `variant_count` is COUNT(DISTINCT sku)
        from the fact (reliable), not from a master table. Images are joined later, only
        for this page, in `product_images`.
        """
        nett = cast(OlabiSales.nett_invoice_value, Numeric(14, 2))
        qty = OlabiSales.total_sales_qty
        net = func.coalesce(func.sum(nett), 0)
        units = func.coalesce(func.sum(qty), 0)
        returns_units = func.coalesce(-func.sum(qty).filter(qty < 0), 0)

        ranked = (
            select(
                OlabiSales.product_code.label("product_code"),
                func.max(OlabiSales.category_name).label("category"),  # product→category is 1:1
                net.label("net_revenue"),
                units.label("units"),
                returns_units.label("returns_units"),
                func.count(distinct(OlabiSales.product_sku_code)).label("variant_count"),
            )
            .where(
                OlabiSales.invoice_date >= date_from,
                OlabiSales.invoice_date < date_to,
                OlabiSales.product_code.isnot(None),
            )
            .group_by(OlabiSales.product_code)
        )
        if rank_by == "returns":
            ranked = ranked.having(returns_units > 0)  # only products that had returns

        order_options: dict[ProductRankBy, ColumnElement[Any]] = {
            "revenue": net,
            "units": units,
            "returns": returns_units,
        }
        ranked = ranked.order_by(order_options[rank_by].desc())

        # total number of groups (for pagination), computed over the same query
        total = (
            await self.session.execute(select(func.count()).select_from(ranked.subquery()))
        ).scalar_one()

        page_rows = (
            await self.session.execute(
                ranked.limit(page_size).offset((page - 1) * page_size)
            )
        ).all()
        return [
            ProductRankRow(
                product_code=r.product_code,
                category=r.category,
                net_revenue=r.net_revenue,
                units=r.units,
                returns_units=r.returns_units,
                variant_count=r.variant_count,
            )
            for r in page_rows
        ], total

    async def product_images(self, product_codes: list[str]) -> dict[str, str]:
        """Map product_code → image URL from `item_master` (join on parentStyleNo).

        ONLY ever called with the current page's codes (a small IN list); item_master is
        small + indexed, so this is ~tens of ms. Returns only codes that have an image.
        """
        if not product_codes:
            return {}
        stmt = (
            select(
                ItemMaster.parent_style_no.label("code"),
                func.max(ItemMaster.image_url).label("image_url"),
            )
            .where(
                ItemMaster.parent_style_no.in_(product_codes),
                ItemMaster.image_url.isnot(None),
                ItemMaster.image_url != "",
            )
            .group_by(ItemMaster.parent_style_no)
        )
        rows = (await self.session.execute(stmt)).all()
        return {r.code: r.image_url for r in rows if r.code and r.image_url}

    async def product_variants(
        self, date_from: datetime, date_to: datetime, product_code: str
    ) -> list[VariantRow]:
        """Per-SKU net revenue + units for one product over the window (drill-down)."""
        nett = cast(OlabiSales.nett_invoice_value, Numeric(14, 2))
        qty = OlabiSales.total_sales_qty
        net = func.coalesce(func.sum(nett), 0)

        stmt = (
            select(
                OlabiSales.product_sku_code.label("sku"),
                net.label("net_revenue"),
                func.coalesce(func.sum(qty), 0).label("units"),
            )
            .where(
                OlabiSales.invoice_date >= date_from,
                OlabiSales.invoice_date < date_to,
                OlabiSales.product_code == product_code,
                OlabiSales.product_sku_code.isnot(None),
            )
            .group_by(OlabiSales.product_sku_code)
            .order_by(net.desc())
        )
        rows = (await self.session.execute(stmt)).all()
        return [
            VariantRow(sku=r.sku, net_revenue=r.net_revenue, units=r.units) for r in rows
        ]
