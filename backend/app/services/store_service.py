"""StoreService — derives the display KPIs (ATV/ASP/basket/discount%/projection) from the
matview roll-up and shapes the wire DTOs. No SQL here; no HTTP here."""

from app.repositories.store_repository import StoreRepository
from app.schemas.stores import StoreLeaderboardResponse, StoreMtdRow


class StoreService:
    """Store leaderboard + (later) per-store detail and hierarchy rollups."""

    def __init__(self, repository: StoreRepository) -> None:
        self.repository = repository

    async def get_leaderboard(self) -> StoreLeaderboardResponse:
        """Current-month MTD KPIs per store, ranked by sale, with derived ratios + projection."""
        rows = await self.repository.mtd_leaderboard()
        items: list[StoreMtdRow] = []
        for r in rows:
            mtd = float(r.mtd_sale)
            mrp = float(r.gross_mrp)
            bills = r.bill_cnt
            qty = float(r.qty)
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
        return StoreLeaderboardResponse(items=items)
