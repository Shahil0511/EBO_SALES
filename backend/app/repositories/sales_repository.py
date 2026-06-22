"""SalesRepository — all aggregation/listing SQL over `olabi_sales`.

Methods take a `SalesFilter` (a resolved *domain* filter, not the Pydantic wire model)
and return small typed dataclasses. The service maps `AnalyticsFilters → SalesFilter`
and turns these results into response DTOs.

ONE shared filter: `_apply_sales_filters` translates a `SalesFilter` into WHERE clauses
and is applied by EVERY method, so a store/brand/search filter affects all endpoints
identically (DRY, no drift).

Conventions (SPEC):
  * money is REAL/float → summed as `cast(col, Numeric(14, 2))`;
  * returns are rows where `total_sales_qty < 0`; gross excludes them;
  * every query carries the `invoice_date` range so TimescaleDB prunes chunks;
  * date bounds are datetimes, half-open [from, to).
"""

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal

from sqlalchemy import ColumnElement, Numeric, Select, cast, distinct, func, or_, select, text
from sqlalchemy.orm import InstrumentedAttribute

from app.models import EboStoreMaster, ItemMaster, OlabiSales
from app.repositories.base import BaseRepository

# ── Input vocabularies owned by the data layer (each maps to concrete columns) ──
TrendBucket = Literal["day", "week"]
_BUCKET_INTERVAL: dict[TrendBucket, str] = {"day": "1 day", "week": "1 week"}

ProductRankBy = Literal["revenue", "units", "returns"]

BreakdownDimension = Literal[
    "store", "category", "brand", "channel", "salesperson", "region", "city", "cluster"
]

# Whitelisted sortable columns for the transactions table (never interpolate user sort).
TransactionSortKey = Literal[
    "date", "invoice", "product", "sku", "store", "category", "brand",
    "qty", "mrp", "discount", "net", "salesperson",
]
_SORT_COLUMNS: dict[TransactionSortKey, InstrumentedAttribute[Any]] = {
    "date": OlabiSales.invoice_date,
    "invoice": OlabiSales.invoice_no,
    "product": OlabiSales.product_code,
    "sku": OlabiSales.product_sku_code,
    "store": OlabiSales.invoice_associate_name,
    "category": OlabiSales.category_name,
    "brand": OlabiSales.brand_name,
    "qty": OlabiSales.total_sales_qty,
    "mrp": OlabiSales.invoice_mrp_value,
    "discount": OlabiSales.invoice_discount_value,
    "net": OlabiSales.nett_invoice_value,
    "salesperson": OlabiSales.sales_person_name,
}


@dataclass(frozen=True, slots=True)
class _DimSpec:
    column: InstrumentedAttribute[str | None]
    needs_store_join: bool = False
    exclude_blank: bool = False


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
class SalesFilter:
    """Resolved, repository-facing filter (domain object — NOT the Pydantic wire model).

    The service builds it from `AnalyticsFilters`, converting the inclusive date range
    into a half-open datetime window. Empty tuples mean 'no filter on that dimension'.
    """

    date_from: datetime
    date_to: datetime
    stores: tuple[str, ...] = ()
    brands: tuple[str, ...] = ()
    categories: tuple[str, ...] = ()
    channels: tuple[str, ...] = ()
    salespersons: tuple[str, ...] = ()
    products: tuple[str, ...] = ()
    qty_min: int | None = None
    qty_max: int | None = None
    search: str | None = None


def _apply_sales_filters(stmt: Select[Any], flt: SalesFilter) -> Select[Any]:
    """Add every active filter as a WHERE clause. The single source of filter truth.

    Filter values map to columns: stores→invoice_associate_code, brands→brand_name,
    categories→category_name, channels→business_channel_code, salespersons→
    sales_person_code, products→product_code. Search is an ILIKE across
    product_code / product_sku_code / invoice_no. All values are bound parameters.
    """
    conditions: list[ColumnElement[bool]] = [
        OlabiSales.invoice_date >= flt.date_from,
        OlabiSales.invoice_date < flt.date_to,
    ]
    if flt.stores:
        conditions.append(OlabiSales.invoice_associate_code.in_(flt.stores))
    if flt.brands:
        conditions.append(OlabiSales.brand_name.in_(flt.brands))
    if flt.categories:
        conditions.append(OlabiSales.category_name.in_(flt.categories))
    if flt.channels:
        conditions.append(OlabiSales.business_channel_code.in_(flt.channels))
    if flt.salespersons:
        conditions.append(OlabiSales.sales_person_code.in_(flt.salespersons))
    if flt.products:
        conditions.append(OlabiSales.product_code.in_(flt.products))
    if flt.qty_min is not None:
        conditions.append(OlabiSales.total_sales_qty >= flt.qty_min)
    if flt.qty_max is not None:
        conditions.append(OlabiSales.total_sales_qty <= flt.qty_max)
    if flt.search:
        term = f"%{flt.search}%"
        conditions.append(
            or_(
                OlabiSales.product_code.ilike(term),
                OlabiSales.product_sku_code.ilike(term),
                OlabiSales.invoice_no.ilike(term),
            )
        )
    return stmt.where(*conditions)


# ── Result dataclasses ───────────────────────────────────────────────────────
@dataclass(frozen=True, slots=True)
class SummaryRow:
    net_revenue: Decimal
    gross_sales: Decimal
    returns_value: Decimal
    units_sold: Decimal
    units_returned: Decimal
    invoices: int
    customers: int
    discount_value: Decimal
    mrp_value: Decimal


@dataclass(frozen=True, slots=True)
class TrendPoint:
    bucket: datetime
    net_revenue: Decimal
    units: Decimal


@dataclass(frozen=True, slots=True)
class BreakdownRow:
    label: str | None
    net_revenue: Decimal
    units: Decimal


@dataclass(frozen=True, slots=True)
class ProductRankRow:
    product_code: str
    category: str | None
    net_revenue: Decimal
    units: Decimal
    returns_units: Decimal
    variant_count: int


@dataclass(frozen=True, slots=True)
class VariantRow:
    sku: str
    net_revenue: Decimal
    units: Decimal


@dataclass(frozen=True, slots=True)
class TransactionRow:
    invoice_date: datetime
    invoice_no: str | None
    product_code: str | None
    sku: str | None
    store: str | None
    channel: str | None
    category: str | None
    brand: str | None
    qty: Decimal
    mrp: float | None
    discount: float | None
    net: float | None
    salesperson: str | None
    customer: str | None
    mobile: str | None
    first_bill_date: date | None


class SalesRepository(BaseRepository):
    """Read-only aggregations + listings over the olabi_sales fact table."""

    async def summary(self, flt: SalesFilter) -> SummaryRow:
        """All headline KPI measures for the filtered window (one round-trip)."""
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
        )
        stmt = _apply_sales_filters(stmt, flt)

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

    async def revenue_trend(self, flt: SalesFilter, bucket: TrendBucket) -> list[TrendPoint]:
        """Net revenue + units per `day`/`week` bucket (TimescaleDB `time_bucket`)."""
        qty = OlabiSales.total_sales_qty
        nett = cast(OlabiSales.nett_invoice_value, Numeric(14, 2))
        bucket_expr = func.time_bucket(  # `bucket` is whitelisted → safe to inline
            text(f"interval '{_BUCKET_INTERVAL[bucket]}'"), OlabiSales.invoice_date
        )

        stmt = select(
            bucket_expr.label("bucket"),
            func.coalesce(func.sum(nett), 0).label("net_revenue"),
            func.coalesce(func.sum(qty), 0).label("units"),
        )
        stmt = _apply_sales_filters(stmt, flt).group_by(bucket_expr).order_by(bucket_expr)

        rows = (await self.session.execute(stmt)).all()
        return [
            TrendPoint(bucket=r.bucket, net_revenue=r.net_revenue, units=r.units) for r in rows
        ]

    async def revenue_by_dimension(
        self, flt: SalesFilter, dimension: BreakdownDimension
    ) -> list[BreakdownRow]:
        """Net revenue + units grouped by one dimension, ordered high→low (ALL groups)."""
        spec = _DIMENSIONS[dimension]
        label = spec.column
        nett = cast(OlabiSales.nett_invoice_value, Numeric(14, 2))
        qty = OlabiSales.total_sales_qty
        net_sum = func.coalesce(func.sum(nett), 0)

        stmt = select(
            label.label("label"),
            net_sum.label("net_revenue"),
            func.coalesce(func.sum(qty), 0).label("units"),
        ).select_from(OlabiSales)
        if spec.needs_store_join:
            stmt = stmt.join(
                EboStoreMaster,
                OlabiSales.invoice_associate_code == EboStoreMaster.store_code,
                isouter=True,
            )
        stmt = _apply_sales_filters(stmt, flt)
        if spec.exclude_blank:  # salesperson: drop EC's blank staff
            stmt = stmt.where(label.isnot(None), label != "")
        stmt = stmt.group_by(label).order_by(net_sum.desc())

        rows = (await self.session.execute(stmt)).all()
        return [
            BreakdownRow(label=r.label, net_revenue=r.net_revenue, units=r.units) for r in rows
        ]

    async def product_ranking(
        self, flt: SalesFilter, rank_by: ProductRankBy, page: int, page_size: int
    ) -> tuple[list[ProductRankRow], int]:
        """One page of products grouped by `product_code`, ranked by the chosen metric."""
        nett = cast(OlabiSales.nett_invoice_value, Numeric(14, 2))
        qty = OlabiSales.total_sales_qty
        net = func.coalesce(func.sum(nett), 0)
        units = func.coalesce(func.sum(qty), 0)
        returns_units = func.coalesce(-func.sum(qty).filter(qty < 0), 0)

        ranked = select(
            OlabiSales.product_code.label("product_code"),
            func.max(OlabiSales.category_name).label("category"),  # product→category is 1:1
            net.label("net_revenue"),
            units.label("units"),
            returns_units.label("returns_units"),
            func.count(distinct(OlabiSales.product_sku_code)).label("variant_count"),
        )
        ranked = _apply_sales_filters(ranked, flt).where(OlabiSales.product_code.isnot(None))
        ranked = ranked.group_by(OlabiSales.product_code)
        if rank_by == "returns":
            ranked = ranked.having(returns_units > 0)  # only products that had returns

        order_options: dict[ProductRankBy, ColumnElement[Any]] = {
            "revenue": net,
            "units": units,
            "returns": returns_units,
        }
        ranked = ranked.order_by(order_options[rank_by].desc())

        total = (
            await self.session.execute(select(func.count()).select_from(ranked.subquery()))
        ).scalar_one()
        page_rows = (
            await self.session.execute(ranked.limit(page_size).offset((page - 1) * page_size))
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

    async def product_variants(self, flt: SalesFilter, product_code: str) -> list[VariantRow]:
        """Per-SKU net revenue + units for one product over the window (drill-down)."""
        nett = cast(OlabiSales.nett_invoice_value, Numeric(14, 2))
        qty = OlabiSales.total_sales_qty
        net = func.coalesce(func.sum(nett), 0)

        stmt = select(
            OlabiSales.product_sku_code.label("sku"),
            net.label("net_revenue"),
            func.coalesce(func.sum(qty), 0).label("units"),
        )
        stmt = _apply_sales_filters(stmt, flt).where(
            OlabiSales.product_code == product_code,
            OlabiSales.product_sku_code.isnot(None),
        )
        stmt = stmt.group_by(OlabiSales.product_sku_code).order_by(net.desc())

        rows = (await self.session.execute(stmt)).all()
        return [VariantRow(sku=r.sku, net_revenue=r.net_revenue, units=r.units) for r in rows]

    async def transactions(
        self,
        flt: SalesFilter,
        page: int,
        page_size: int,
        sort_key: TransactionSortKey,
        sort_dir: Literal["asc", "desc"],
    ) -> tuple[list[TransactionRow], int]:
        """One page of raw line items for the table, filtered + sorted (whitelisted)."""
        base = select(
            OlabiSales.invoice_date,
            OlabiSales.invoice_no,
            OlabiSales.product_code,
            OlabiSales.product_sku_code,
            OlabiSales.invoice_associate_name,
            OlabiSales.business_channel_code,
            OlabiSales.category_name,
            OlabiSales.brand_name,
            OlabiSales.total_sales_qty,
            OlabiSales.invoice_mrp_value,
            OlabiSales.invoice_discount_value,
            OlabiSales.nett_invoice_value,
            OlabiSales.sales_person_name,
            OlabiSales.consumer_name,
            OlabiSales.consumer_mobile,
            OlabiSales.consumer_first_bill_date,
        )
        base = _apply_sales_filters(base, flt)

        total = (
            await self.session.execute(
                _apply_sales_filters(select(func.count()).select_from(OlabiSales), flt)
            )
        ).scalar_one()

        sort_col = _SORT_COLUMNS[sort_key]
        direction = sort_col.desc() if sort_dir == "desc" else sort_col.asc()
        # secondary sort on invoice_no for a stable, deterministic page order
        page_stmt = (
            base.order_by(direction, OlabiSales.invoice_no)
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
        rows = (await self.session.execute(page_stmt)).all()
        return [
            TransactionRow(
                invoice_date=r.invoice_date,
                invoice_no=r.invoice_no,
                product_code=r.product_code,
                sku=r.product_sku_code,
                store=r.invoice_associate_name,
                channel=r.business_channel_code,
                category=r.category_name,
                brand=r.brand_name,
                qty=r.total_sales_qty,
                mrp=r.invoice_mrp_value,
                discount=r.invoice_discount_value,
                net=r.nett_invoice_value,
                salesperson=r.sales_person_name,
                customer=r.consumer_name,
                mobile=r.consumer_mobile,
                first_bill_date=r.consumer_first_bill_date,
            )
            for r in rows
        ], total
