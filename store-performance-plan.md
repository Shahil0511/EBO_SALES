# LIBAS — Store Performance ("Store Pulse") Plan

> A new, **information-dense** Store Performance area that loads in the **blink of an eye** — because it
> reads two **pre-aggregated** warehouse objects (52 rows + 135k rows) instead of crunching the 1.4M-row
> `olabi_sales` fact table. Maximum meaningful detail, near-zero latency.

## Context
You granted read access to two prebuilt store-performance aggregates. They already contain everything a
store leaderboard / drill-down needs — bills, ATV, ASP, basket, discount%, projection, week-over-week, full
manager hierarchy, salesperson splits — so we surface them directly. No heavy compute, no waiting.

### Data sources (verified live, read-only)
**`ebo_mtd_performance`** — table, **52 rows** (one per store). *Current month-to-date snapshot.* Columns:
`store_name, store_type, mtd_sale, gross_mrp, disc_pct, bill_cnt, qty, bsk_sze (items/bill), atv (avg txn value),
asp (avg selling price), op_day (operating days so far), avg_sale (per-day), projection_sale (projected full
month), wow_bill, wow_bills_points, wow_bill_nsv, wbill_contri_nob, wbill_contri_gsv`.
→ Join to `store_code` via `ebo_store_master.store_name` (to link with the existing store filter/code).

**`eg_store_day_mv`** — matview, **~135k rows** (grain = store × day × salesperson, from 2024-04 → today).
Columns: `bucket (date), store_code, store_name, store_type, region, state, city, cluster, area,
store_manager, cluster_manager, area_manager, regional_manager, sales_person_code, sales_person_name,
nsv (net sales value), gsv (gross sales value), mrp, discount_value, bill_cnt, qty, returns,
wow_bill, wow_bills_points, wow_bill_nsv`.
→ `store_code` matches `olabi_sales.invoice_associate_code`, so it links cleanly to the existing app.

**Why it's fast:** `ebo_mtd_performance` is 52 rows → leaderboard is effectively free. `eg_store_day_mv` is
~135k *pre-summed daily* rows → any group-by (by store / day / hierarchy / salesperson) scans a fraction of
what `olabi_sales` aggregation would, and the date filter prunes further. Both are indexable on
`store_code` + `bucket`.

---

## What we build

### 1. Store leaderboard (current month) — instant, dense
A sortable, color-coded grid/table of **all 52 stores** from `ebo_mtd_performance`, each row showing:
**MTD sale · Projection (full-month) · Bills · Qty · ATV · ASP · Basket · Discount% · Op-days · Avg/day ·
WoW bills (▲/▼ + points) · WoW NSV**. Sort by any column; rank badge; the projection vs MTD shows pacing;
WoW arrows flag momentum; high discount% / high returns highlight in rust. One tiny query → renders instantly.

### 2. Store detail page (`/stores?code=<store_code>`) — "extreme" drill-down
Header: store name + type + region/city/cluster + the **full manager chain** (store → cluster → area →
regional). Then, all from `eg_store_day_mv` (date-filtered, fast):
- **KPI tiles:** NSV, GSV, MRP, discount value + %, bills, qty, returns, basket, ATV — for the selected range,
  plus the **MTD snapshot** tiles (projection, op-days, WoW) from `ebo_mtd_performance`.
- **Daily trend:** multi-series area/line of NSV (and toggle GSV / bills / qty / returns) over the range.
- **Salesperson leaderboard within the store:** each rep's NSV, bills, qty, ATV (group by `sales_person`).
- **Discount & returns trend:** discount% and returns over time (quality signals).
- **WoW panel:** bills/NSV week-over-week.

### 3. Hierarchy rollups & manager filter
`eg_store_day_mv` carries region/state/city/cluster + 4 manager levels, so we add:
- **Roll-up leaderboards** by **region / cluster / area-manager / regional-manager**: total NSV, bills, store
  count, avg ATV — to see performance at each level of the org.
- A **manager/hierarchy filter** (pick a regional/area/cluster manager or a region) that scopes the
  leaderboard + rollups to their stores. (Complements the existing sidebar filters.)

### 4. Wire-ins
- The existing **store breakdown bar** and **transactions** store column → link to `/stores?code=`.
- The store detail page sits inside the **shared shell** (sidebar + nav), like the other detail pages.

---

## Backend (new — all read-only, all over the two aggregates)
Reuse the existing layered pattern (model → repository → service → schema → router; camelCase DTOs; DI).

- **Models** (`app/models/`): map `ebo_mtd_performance` and `eg_store_day_mv` as read-only ORM/Core tables
  (no DDL — they exist). Model only the columns we query.
- **Repository** (`app/repositories/store_repository.py`, new — keeps `sales_repository` focused):
  - `mtd_leaderboard()` → all 52 rows from `ebo_mtd_performance` (+ join `store_code` via store master).
  - `store_mtd(store_code)` → one store's MTD row.
  - `store_daily(store_code, date_from, date_to)` → daily series from `eg_store_day_mv` (group by `bucket`).
  - `store_salespeople(store_code, date_from, date_to)` → per-rep totals (group by `sales_person`).
  - `hierarchy_rollup(level, date_from, date_to)` → totals grouped by region|cluster|area_manager|regional_manager.
  - All take an optional manager/region scope; all push aggregation into SQL.
- **Schemas** (`app/schemas/stores.py`): `StoreMtdRow`, `StoreLeaderboard`, `StoreDailyPoint`, `StoreDetail`,
  `HierarchyRow` (camelCase).
- **Endpoints** (`app/api/v1/routers/stores.py`, registered in `router.py`):
  - `GET /stores/leaderboard` → current-month leaderboard (optional `region`/`manager` scope).
  - `GET /stores/{store_code}` → MTD snapshot + daily series + salesperson split (takes `dateFrom/dateTo`).
  - `GET /stores/hierarchy/{level}` → rollup leaderboard (`level` ∈ region|cluster|areaManager|regionalManager).
  - `GET /stores/managers` → distinct managers/regions for the hierarchy filter.

## Frontend (new)
- **Route** `app/stores/page.tsx` → `components/stores/store-route.tsx` (reads `?code=`): with code → store
  detail; without → the **leaderboard + hierarchy rollups** view. Static route + Suspense (the reliable pattern).
- **Hooks** (`lib/api/hooks/`): `use-store-leaderboard`, `use-store-detail`, `use-store-hierarchy`,
  `use-store-managers`. Regenerate the typed client (`npm run gen:api`) after the backend lands.
- **Components** (`components/stores/`): `store-leaderboard.tsx` (dense sortable table, color-coded),
  `store-detail.tsx` (KPI tiles + trend + salesperson list + WoW), `hierarchy-rollups.tsx`,
  `manager-filter.tsx`. Reuse `StatTile`, `DeltaBadge`, the trend chart, `TransactionsTable`, `PageCrumb`.
- A **"Stores" entry** in the nav/sidebar to reach the leaderboard.

---

## Milestones (DONE-gated, each verified)
- **SP1 — Backend foundation:** models for both aggregates + `store_repository.mtd_leaderboard()` +
  `/stores/leaderboard` endpoint. Smoke-test (52 rows, instant).
- **SP2 — Leaderboard UI:** `/stores` page with the dense, sortable, color-coded current-month leaderboard.
- **SP3 — Store detail (backend):** `store_daily` + `store_mtd` + `store_salespeople` + `GET /stores/{code}`.
- **SP4 — Store detail (UI):** `/stores?code=` page — KPI tiles, daily trend, salesperson leaderboard, WoW.
  Link the store breakdown bar + transactions store column to it.
- **SP5 — Hierarchy & manager filter:** rollup endpoint + UI (region/cluster/area-manager/regional-manager)
  + the manager scope filter.
- **SP6 — Polish:** density pass (sparklines per row, conditional formatting), motion, empty/loading states.

## Verification (per milestone)
Backend: `mypy --strict` + `ruff` clean · **read-only** smoke query against the warehouse (confirm row counts
+ sample numbers) · regenerate the typed client. Frontend: `tsc --noEmit` + `eslint` clean · route 200 · live
check at :3000 · confirm the page renders in well under a second (these aggregates make that easy).

> **Speed guarantee:** every store view reads a pre-aggregated object (52 or ~135k rows), never the 1.4M-row
> fact table — so "extreme detail" and "blink of an eye" are not in tension here.
