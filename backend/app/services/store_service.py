"""StoreService — derives the display KPIs (ATV/ASP/basket/discount%/projection) from the
matview roll-up and shapes the wire DTOs. No SQL here; no HTTP here."""

import calendar
from datetime import date

from app.core.exceptions import NotFoundError
from app.repositories.sales_repository import SalesRepository
from app.repositories.store_repository import HierarchyLevel, StoreRepository
from app.schemas.stores import (
    HierarchyResponse,
    HierarchyRow,
    SalespersonDetailResponse,
    SalespersonProductOut,
    SalespersonStoreOut,
    StoreDayPoint,
    StoreDetailResponse,
    StoreLeaderboardResponse,
    StoreMtdRow,
    StorePersonRow,
)


class StoreService:
    """Store leaderboard, per-store detail, hierarchy rollups, and salesperson detail."""

    def __init__(self, repository: StoreRepository, sales_repository: SalesRepository) -> None:
        self.repository = repository
        self.sales_repository = sales_repository

    async def get_leaderboard(self) -> StoreLeaderboardResponse:
        """Current-month MTD KPIs per store, ranked by sale, with derived ratios + projection."""
        as_of, rows = await self.repository.mtd_leaderboard()

        # Real targets vs the actual: pace-to-date achievement % (daily target × days elapsed).
        targets: dict[str, float] = {}
        elapsed_days = 0
        if as_of is not None:
            month_start = as_of.replace(day=1)
            elapsed_days = (as_of - month_start).days + 1
            targets = await self.repository.current_month_targets(month_start)

        items: list[StoreMtdRow] = []
        for r in rows:
            mtd = float(r.mtd_sale)
            mrp = float(r.gross_mrp)
            bills = r.bill_cnt
            qty = float(r.qty)
            # Operating-day pace × calendar days — matches the warehouse `ebo_mtd_performance`
            # view's projection convention (assumes the store keeps trading the rest of the month).
            avg_sale = mtd / r.op_day if r.op_day else 0.0
            daily_target = targets.get(r.store_name.strip().lower()) if r.store_name else None
            target_to_date = daily_target * elapsed_days if daily_target else None
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
                    month_target=daily_target * r.days_in_month if daily_target else None,
                    achievement_pct=(mtd / target_to_date * 100) if target_to_date else None,
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

        # Current-month target context (independent of the window) — "this month vs target".
        # Key the target off the CURRENT-MONTH store name (mtd.store_name), not the windowed
        # summary name, so this matches the leaderboard exactly even if the name drifted over time.
        month_target: float | None = None
        achievement_pct: float | None = None
        as_of = await self.repository.data_as_of()
        if as_of is not None:
            month_start = as_of.replace(day=1)
            mtd = await self.repository.store_summary(store_code, month_start, as_of)
            if mtd is not None and mtd.store_name:
                daily = (await self.repository.current_month_targets(month_start)).get(
                    mtd.store_name.strip().lower()
                )
                if daily:
                    elapsed = (as_of - month_start).days + 1
                    days_in_month = calendar.monthrange(as_of.year, as_of.month)[1]
                    target_to_date = daily * elapsed
                    month_target = daily * days_in_month
                    if target_to_date:
                        achievement_pct = float(mtd.nsv) / target_to_date * 100

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
            month_target=month_target,
            achievement_pct=achievement_pct,
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

    async def get_salesperson_detail(
        self, code: str, date_from: date, date_to: date
    ) -> SalespersonDetailResponse:
        """One salesperson's detail: KPIs + daily trend (matview) + their stores + top products."""
        summary = await self.repository.salesperson_summary(code, date_from, date_to)
        if summary is None:
            raise NotFoundError(f"Salesperson '{code}' has no data in this window")
        days = await self.repository.salesperson_daily(code, date_from, date_to)
        stores = await self.repository.salesperson_stores(code, date_from, date_to)
        products = await self.sales_repository.salesperson_top_products(code, date_from, date_to, 8)
        images = await self.sales_repository.product_images([p.product_code for p in products])

        nsv = float(summary.nsv)
        mrp = float(summary.mrp)
        bills = summary.bill_cnt
        qty = float(summary.qty)
        return SalespersonDetailResponse(
            code=summary.code,
            name=summary.name,
            region=summary.region,
            store_manager=summary.store_manager,
            # Busiest store by bills (returns-resistant — net NSV can go negative on returns).
            primary_store=(max(stores, key=lambda s: s.bill_cnt).store_name if stores else None),
            store_count=summary.store_count,
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
            stores=[
                SalespersonStoreOut(
                    store_code=s.store_code,
                    store_name=s.store_name,
                    nsv=float(s.nsv),
                    bill_cnt=s.bill_cnt,
                )
                for s in stores
            ],
            top_products=[
                SalespersonProductOut(
                    product_code=p.product_code,
                    image_url=images.get(p.product_code),
                    nsv=float(p.nsv),
                    qty=p.qty,
                )
                for p in products
            ],
        )
