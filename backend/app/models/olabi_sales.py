"""Read-only mapping of `olabi_sales` — the fact table (TimescaleDB hypertable).

One row = one invoice line item. Column contract: backend/docs/SPEC.md.

PRIMARY KEY NOTE: `olabi_sales` has no DB primary key (it's a hypertable). The ORM
mapper *requires* one, so we declare a composite of (invoice_no, product_sku_code,
invoice_date) as `primary_key=True`. This is a MAPPING ARTIFACT ONLY — it creates no
constraint in the database. It is safe because we only ever SELECT columns/aggregates
(Row results), never load whole-entity identity sets.

Money columns are REAL (float) in the source; sum them as `cast(col, Numeric)` in the
repository to avoid float drift (see SPEC §1).
"""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Float, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class OlabiSales(Base):
    __tablename__ = "olabi_sales"

    # ── Store ────────────────────────────────────────────────────────────────
    invoice_associate_code: Mapped[str | None] = mapped_column(String)  # → store_master.store_code
    invoice_associate_name: Mapped[str | None] = mapped_column(String)
    store_city: Mapped[str | None] = mapped_column(String)

    # ── Time (hypertable chunk key; part of the mapping-only PK) ──────────────
    invoice_date: Mapped[datetime] = mapped_column(DateTime, primary_key=True)

    # ── Product dimensions ────────────────────────────────────────────────────
    brand_name: Mapped[str | None] = mapped_column(String)
    category_name: Mapped[str | None] = mapped_column(String)
    product_code: Mapped[str | None] = mapped_column(String)  # parent style
    product_sku_code: Mapped[str | None] = mapped_column(String, primary_key=True)  # variant

    # ── Measures (money is REAL/float; qty is NUMERIC → Decimal) ──────────────
    total_sales_qty: Mapped[Decimal | None] = mapped_column(Numeric)  # < 0 ⇒ return
    unit_mrp: Mapped[float | None] = mapped_column(Float)
    invoice_mrp_value: Mapped[float | None] = mapped_column(Float)
    invoice_discount_value: Mapped[float | None] = mapped_column(Float)
    invoice_basic_value: Mapped[float | None] = mapped_column(Float)
    invoice_tax_value: Mapped[float | None] = mapped_column(Float)
    nett_invoice_value: Mapped[float | None] = mapped_column(Float)  # the revenue measure

    # ── Invoice / channel / staff ─────────────────────────────────────────────
    invoice_no: Mapped[str] = mapped_column(String, primary_key=True)
    business_channel_code: Mapped[str | None] = mapped_column(String)  # BM / EC
    sales_person_code: Mapped[str | None] = mapped_column(String)  # blank on EC
    sales_person_name: Mapped[str | None] = mapped_column(String)

    # ── Customer (PII — must be masked in logs) ───────────────────────────────
    consumer_name: Mapped[str | None] = mapped_column(String)
    consumer_mobile: Mapped[str | None] = mapped_column(String)  # distinct-customer key
    consumer_e_mail: Mapped[str | None] = mapped_column(String)
    consumer_pincode: Mapped[str | None] = mapped_column(String)
    consumer_first_bill_date: Mapped[date | None] = mapped_column(Date)
