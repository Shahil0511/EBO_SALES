"""StoreRepository — read-only roll-ups over the `eg_store_day_mv` matview.

Kept separate from `SalesRepository` (the fact table). Every read here hits the pre-aggregated,
*stored* matview, so it returns in a fraction of a second.
"""

import calendar
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import distinct, func, select

from app.models import EgStoreDay
from app.repositories.base import BaseRepository


@dataclass(frozen=True, slots=True)
class StoreMtdRaw:
    """One store's month-to-date raw aggregates (the service derives ATV/ASP/basket/projection)."""

    store_code: str
    store_name: str | None
    store_type: str | None
    region: str | None
    state: str | None
    city: str | None
    cluster: str | None
    store_manager: str | None
    cluster_manager: str | None
    area_manager: str | None
    regional_manager: str | None
    mtd_sale: Decimal
    gross_mrp: Decimal
    discount: Decimal
    bill_cnt: int
    qty: Decimal
    returns: Decimal
    op_day: int
    days_in_month: int
    wow_bill: int  # this-week bills − prior-week bills
    wow_bill_nsv: float  # this-week NSV


class StoreRepository(BaseRepository):
    """Store leaderboard + (later) per-store detail and hierarchy rollups."""

    async def mtd_leaderboard(self) -> list[StoreMtdRaw]:
        """Current-month roll-up per store from the matview, ranked by NSV, with a WoW bill delta.
        Two small group-by scans of ~135k stored rows → sub-second."""
        g = EgStoreDay
        max_bucket: date | None = await self.session.scalar(select(func.max(g.bucket)))
        if max_bucket is None:
            return []
        month_start = max_bucket.replace(day=1)
        days_in_month = calendar.monthrange(max_bucket.year, max_bucket.month)[1]
        cur_week_start = max_bucket - timedelta(days=6)
        prev_week_start = max_bucket - timedelta(days=13)
        prev_week_end = max_bucket - timedelta(days=7)

        agg_stmt = (
            select(
                g.store_code,
                func.max(g.store_name).label("store_name"),
                func.max(g.store_type).label("store_type"),
                func.max(g.region).label("region"),
                func.max(g.state).label("state"),
                func.max(g.city).label("city"),
                func.max(g.cluster).label("cluster"),
                func.max(g.store_manager).label("store_manager"),
                func.max(g.cluster_manager).label("cluster_manager"),
                func.max(g.area_manager).label("area_manager"),
                func.max(g.regional_manager).label("regional_manager"),
                func.coalesce(func.sum(g.nsv), 0).label("mtd_sale"),
                func.coalesce(func.sum(g.mrp), 0).label("gross_mrp"),
                func.coalesce(func.sum(g.discount_value), 0).label("discount"),
                func.coalesce(func.sum(g.bill_cnt), 0).label("bill_cnt"),
                func.coalesce(func.sum(g.qty), 0).label("qty"),
                func.coalesce(func.sum(g.returns), 0).label("returns"),
                func.count(distinct(g.bucket)).label("op_day"),
            )
            .where(g.bucket >= month_start, g.store_code.isnot(None))
            .group_by(g.store_code)
            .order_by(func.sum(g.nsv).desc())
        )
        agg_rows = (await self.session.execute(agg_stmt)).all()

        cur = g.bucket >= cur_week_start
        prev = (g.bucket >= prev_week_start) & (g.bucket <= prev_week_end)
        wow_stmt = (
            select(
                g.store_code,
                func.coalesce(func.sum(g.bill_cnt).filter(cur), 0).label("cur_bills"),
                func.coalesce(func.sum(g.bill_cnt).filter(prev), 0).label("prev_bills"),
                func.coalesce(func.sum(g.nsv).filter(cur), 0).label("cur_nsv"),
            )
            .where(g.bucket >= prev_week_start)
            .group_by(g.store_code)
        )
        wow = {
            r.store_code: (int(r.cur_bills) - int(r.prev_bills), float(r.cur_nsv))
            for r in (await self.session.execute(wow_stmt)).all()
        }

        out: list[StoreMtdRaw] = []
        for r in agg_rows:
            wb, wnsv = wow.get(r.store_code, (0, 0.0))
            out.append(
                StoreMtdRaw(
                    store_code=r.store_code,
                    store_name=r.store_name,
                    store_type=r.store_type,
                    region=r.region,
                    state=r.state,
                    city=r.city,
                    cluster=r.cluster,
                    store_manager=r.store_manager,
                    cluster_manager=r.cluster_manager,
                    area_manager=r.area_manager,
                    regional_manager=r.regional_manager,
                    mtd_sale=r.mtd_sale,
                    gross_mrp=r.gross_mrp,
                    discount=r.discount,
                    bill_cnt=int(r.bill_cnt),
                    qty=r.qty,
                    returns=r.returns,
                    op_day=int(r.op_day),
                    days_in_month=days_in_month,
                    wow_bill=wb,
                    wow_bill_nsv=wnsv,
                )
            )
        return out
