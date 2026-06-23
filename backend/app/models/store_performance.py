"""Read-only mapping of `eg_store_day_mv` — a MATERIALIZED view of daily store performance
(~135k rows, grain = store × day × salesperson, since 2024-04, fresh to ~2 days ago).

This is the fast spine of the Store Performance feature: it's pre-aggregated and stored, so a
month-to-date roll-up over it runs in ~0.3s — versus an 11s recompute of the `ebo_mtd_performance`
VIEW or a multi-second scan of the 1.4M-row fact table. It also already carries the full geo +
management hierarchy, so no joins are needed for grouping/filtering.

It has no real primary key (it's a matview); we declare a composite key for the ORM only — we only
ever `select()` specific columns + `group_by`, never load whole entities, so this is metadata-only.
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import BigInteger, Date, Float, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class EgStoreDay(Base):
    __tablename__ = "eg_store_day_mv"

    bucket: Mapped[date] = mapped_column(Date, primary_key=True)
    store_code: Mapped[str] = mapped_column(String, primary_key=True)
    sales_person_code: Mapped[str | None] = mapped_column(String, primary_key=True)
    sales_person_name: Mapped[str | None] = mapped_column(String)
    store_name: Mapped[str | None] = mapped_column(String)
    store_type: Mapped[str | None] = mapped_column(String)
    region: Mapped[str | None] = mapped_column(String)
    state: Mapped[str | None] = mapped_column(String)
    city: Mapped[str | None] = mapped_column(String)
    cluster: Mapped[str | None] = mapped_column(String)
    area: Mapped[str | None] = mapped_column(String)
    store_manager: Mapped[str | None] = mapped_column(String)
    cluster_manager: Mapped[str | None] = mapped_column(String)
    area_manager: Mapped[str | None] = mapped_column(String)
    regional_manager: Mapped[str | None] = mapped_column(String)
    nsv: Mapped[Decimal | None] = mapped_column(Numeric)  # net sales value
    gsv: Mapped[Decimal | None] = mapped_column(Numeric)  # gross sales value
    mrp: Mapped[Decimal | None] = mapped_column(Numeric)
    discount_value: Mapped[Decimal | None] = mapped_column(Numeric)
    bill_cnt: Mapped[int | None] = mapped_column(BigInteger)
    qty: Mapped[Decimal | None] = mapped_column(Numeric)
    returns: Mapped[Decimal | None] = mapped_column(Numeric)
    wow_bill: Mapped[int | None] = mapped_column(BigInteger)
    wow_bills_points: Mapped[int | None] = mapped_column(BigInteger)
    wow_bill_nsv: Mapped[float | None] = mapped_column(Float)
