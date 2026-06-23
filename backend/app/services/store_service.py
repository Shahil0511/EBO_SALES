"""StoreService — derives the display KPIs (ATV/ASP/basket/discount%/projection) from the
matview roll-up and shapes the wire DTOs. No SQL here; no HTTP here."""

from datetime import date

from app.core.exceptions import NotFoundError
from app.repositories.store_repository import HierarchyLevel, StoreRepository
from app.schemas.stores import (
    HierarchyResponse,
    HierarchyRow,
    StoreDayPoint,
    StoreDetailResponse,
    StoreLeaderboardResponse,
    StoreMtdRow,
    StorePersonRow,
)


class StoreService:
    """Store leaderboard + (later) per-store detail and hierarchy rollups."""

    def __init__(self, repository: StoreRepository) -> None:
        self.repository = repository

    async def get_leaderboard(self) -> StoreLeaderboardResponse:
        """Current-month MTD KPIs per store, ranked by sale, with derived ratios + projection."""
        as_of, rows = await self.repository.mtd_leaderboard()
        items: list[StoreMtdRow] = []
        for r in rows:
            mtd = float(r.mtd_sale)
            mrp = float(r.gross_mrp)
            bills = r.bill_cnt
            qty = float(r.qty)
            # Operating-day pace × calendar days — matches the warehouse `ebo_mtd_performance`
            # view's projection convention (assumes the store keeps trading the rest of the month).
            avg_sale = mtd / r.op_day if r.op_day else 0.0
            items.append(
                StoreMtdRow(
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
                    mtd_sale=mtd,
                    gross_mrp=mrp,
                    disc_pct=(float(r.discount) / mrp * 100) if mrp else 0.0,
                    bill_cnt=bills,
                    qty=qty,
                    returns=float(r.returns),
                    basket=(qty / bills) if bills else 0.0,
                    atv=(mtd / bills) if bills else 0.0,
                    asp=(mtd / qty) if qty else 0.0,
                    op_day=r.op_day,
                    avg_sale=avg_sale,
                    projection_sale=avg_sale * r.days_in_month,
                    wow_bill=r.wow_bill,
                    wow_bill_nsv=r.wow_bill_nsv,
                )
            )
        return StoreLeaderboardResponse(as_of=as_of, items=items)

    async def get_store_detail(
        self, store_code: str, date_from: date, date_to: date
    ) -> StoreDetailResponse:
        """One store's detail for the window: KPIs + daily series + salesperson leaderboard."""
        summary = await self.repository.store_summary(store_code, date_from, date_to)
        if summary is None:
            raise NotFoundError(f"Store '{store_code}' has no data in this window")
        days = await self.repository.store_daily(store_code, date_from, date_to)
        people = await self.repository.store_salespeople(store_code, date_from, date_to)

        nsv = float(summary.nsv)
        mrp = float(summary.mrp)
        bills = summary.bill_cnt
        qty = float(summary.qty)
        return StoreDetailResponse(
            store_code=summary.store_code,
            store_name=summary.store_name,
            store_type=summary.store_type,
            region=summary.region,
            state=summary.state,
            city=summary.city,
            cluster=summary.cluster,
            store_manager=summary.store_manager,
            cluster_manager=summary.cluster_manager,
            area_manager=summary.area_manager,
            regional_manager=summary.regional_manager,
            nsv=nsv,
            gsv=float(summary.gsv),
            mrp=mrp,
            discount=float(summary.discount),
            disc_pct=(float(summary.discount) / mrp * 100) if mrp else 0.0,
            bill_cnt=bills,
            qty=qty,
            returns=float(summary.returns),
            atv=(nsv / bills) if bills else 0.0,
            asp=(nsv / qty) if qty else 0.0,
            basket=(qty / bills) if bills else 0.0,
            op_day=summary.op_day,
            avg_sale=(nsv / summary.op_day) if summary.op_day else 0.0,
            trend=[
                StoreDayPoint(
                    bucket=d.bucket,
                    nsv=float(d.nsv),
                    bill_cnt=d.bill_cnt,
                    qty=float(d.qty),
                    returns=float(d.returns),
                )
                for d in days
            ],
            salespeople=[
                StorePersonRow(
                    code=p.code,
                    name=p.name,
                    nsv=float(p.nsv),
                    bill_cnt=p.bill_cnt,
                    qty=float(p.qty),
                    atv=(float(p.nsv) / p.bill_cnt) if p.bill_cnt else 0.0,
                )
                for p in people
            ],
        )

    async def get_hierarchy(self, level: HierarchyLevel) -> HierarchyResponse:
        """Current-month totals grouped by one hierarchy level, ranked by NSV."""
        as_of, rows = await self.repository.hierarchy_rollup(level)
        items = [
            HierarchyRow(
                label=r.label,
                nsv=float(r.nsv),
                bill_cnt=r.bill_cnt,
                qty=float(r.qty),
                store_count=r.store_count,
                atv=(float(r.nsv) / r.bill_cnt) if r.bill_cnt else 0.0,
            )
            for r in rows
        ]
        return HierarchyResponse(level=level, as_of=as_of, items=items)
