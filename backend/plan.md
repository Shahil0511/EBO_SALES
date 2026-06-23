# LIBAS Sales Intelligence — Prototype → Enterprise Read-API (Mentorship Plan)

> Living plan. All backend code & docs live under `D:\LIBAS\files\backend\`.
> We work milestone-by-milestone (~1–3 h each); you say **DONE**, I review, then unlock the next.

## Context

You inherited a clever **prototype** dashboard for Libas EBO (retail-store) sales. After connecting to
your live database, the original "migrate Excel → Postgres" brief no longer applies:

**The data is already in PostgreSQL.** `EBO_SALES.csv` was a 3-month *export* of **`public.olabi_sales`**
— a TimescaleDB **hypertable** (~1.41M rows, 5 years: 2021‑08 → 2026‑06) in the production **`Unicorn`**
warehouse, fed by upstream ETL (the `*_tmp`-swap tables). **Our login is read-only** — it can `SELECT`
93 of 105 public objects (incl. `olabi_sales`) but **cannot create anything**, and a few tables
(e.g. `ebo_store_master`) are denied. Your direction: *"data is only fetched, DB already made, nothing
to change."*

So we are **not** building a database. We are building an **enterprise-grade, read-only Analytics API**
(a Backend-for-Frontend) that does server-side what the prototype does in the browser: query
`olabi_sales` (+ readable dims) through a clean, layered, versioned FastAPI service, serving small JSON
endpoints to the future Next.js dashboard. This kills the prototype's real sins — the 4.3 MB browser
data-blob, PII shipped to the client, "no architecture" — without touching the warehouse.

---

## 1. Ground truth — the warehouse (measured against the live DB)

**Main fact table — `public.olabi_sales`** (TimescaleDB hypertable on `invoice_date`, 253 chunks).
**1,413,608 rows · 36,466 returns · 2021‑08‑21 → 2026‑06‑22.** 29 columns:

```
invoice_associate_code, invoice_associate_name      -- STORE (57 distinct codes); join → olabi_stores.store_code
invoice_date  TIMESTAMP NOT NULL                    -- time dimension / chunk key (date filters chunk-prune)
brand_name (6),  category_name (45)
product_code (parent/style),  product_sku_code (variant),  hsn_code,  barcode
total_sales_qty  NUMERIC                             -- negative = RETURN
unit_mrp, invoice_mrp_value, invoice_discount_value,
invoice_basic_value, invoice_tax_value, nett_invoice_value   -- all REAL (float!) · PER-LINE-ITEM
invoice_no,  business_channel_code                   -- BM = offline store (1,373,103 / ₹269 Cr), EC = online (40,505 / ₹5 Cr)
sales_person_code, sales_person_name                 -- blank on EC (online has no in-store staff)
consumer_name, consumer_mobile, consumer_e_mail, consumer_pincode,
consumer_first_bill_date  DATE
store_city, invoice_offer_description, order_associate_code, order_associate_name
```

Brands: `Libas` (1.32M), `Libas Art` (80k), `EXTRA LOVE BY LIBAS` (10.7k), `Gerua By Libas` (6.2k),
`Libas KIDS` (694), `Other Brand` (263).

> ⚠️ **Money columns are `real` (float).** We must cast to `numeric` in SQL for money `SUM`s and round
> at the API edge to avoid float drift.

**Readable supporting objects (verified `SELECT` granted):**

| Object | Kind | Use |
|--------|------|-----|
| `ebo_store_master` (53 rows, 32 cols) | table | **Store dimension** (now readable) — LEFT JOIN `olabi_sales.invoice_associate_code = ebo_store_master.store_code` (53/57 match). Brings region/state/city/cluster/store_type/managers/lat-long → store + **region/city/cluster** breakdowns. |
| `olabi_stores` (60 rows: `store_code`, `store_name`) | view | Canonical `store_code`↔`store_name` list; fallback for the 4 unmatched (warehouse/online) stores. |
| `olabi_dim_table` / `olabi_dim_store` | table/matview | `parentStyleNo` (= `product_code`) → `imageurl`, `varientcount` → product gallery image + size-variant count. |
| `ebo_rls_access` (107: `email`→`store_name`) | table | Per-user **store access** mapping → optional store-scoping seam (later). |
| `cust_master_profile` (2.3M, 91 cols: RFM/churn/retention) | matview | Future customer-360 analytics. |
| `ebo_store_target`, `ebo_planned_tgt`, `ebo_mbq_tgt` | tables | Future target-vs-actual analytics. |
| `sku_master`, `item_master`, `style_tag` | tables | Product master enrichment if needed. |

**Not readable (don't design around these):** `ebo_mtd_performance`,
`cust_email_ph_master`, `cust_monthly_active_mv`, `eg_store_day_mv`.
*(`sales_daywise` / `return_daywise` are readable but are **online/marketplace** (Myntra/Shopify)
rollups — a different channel, **not** EBO. EBO reads `olabi_sales`.)*

**Locked decisions:** ① query the warehouse **directly, read-only**; ② **no app DB / Alembic / ETL** —
view access only; ③ `olabi_sales` is the primary source; ④ all backend code under `backend/`.

**Assumptions (correct me anytime):** (a) v1 shows **all stores to every caller** — `ebo_rls_access`
scoping is built as a *seam*, enabled later when Data Nexus forwards the user email; (b) v1 = **prototype
parity**, with customer-360 / targets as later epics; (c) "EBO scope" = `olabi_sales` as-is (BM+EC).

---

## 2. The prototype, and what survives

| File | What it is | Fate |
|------|-----------|------|
| `app.py` | Single-file FastAPI: pandas reads CSV → gzip columnar snapshot → `/api/snapshot`. `load_from_postgres` stub = the seam to the real DB. | **Re-architect** into a layered read-API; keep the column contract + SQL-source idea. |
| `index.html` | Standalone vanilla-JS dashboard; embeds the whole dataset, aggregates client-side. | **Keep as the functional spec** (→ `backend/docs/SPEC.md`); rebuilt later in Next.js. |
| `EBO_SALES.csv` | 3-month export of `olabi_sales`. | **Drop** — read the live table. |

**Analytics to reproduce, now server-side:** KPIs (net revenue, gross, returns value+units, invoices,
units, distinct customers, discount rate) + **period-over-period deltas**; breakdowns by day/week-trend,
store, category(+units), brand, channel, salesperson; product gallery (image, variant count, ranked by
revenue/units/returns); paginated/sortable transactions; global search (product/sku/invoice); cascading
staff filter; CSV export. Filters: date range, multi-select store/brand/category/channel/salesperson/
product, qty min/max.

---

## 3. Target architecture (read-only, clean, layered)

Golden rule: **dependencies point inward.** Routes → services → repositories → SQLAlchemy → Postgres.
(JS instinct: dumb components + logic in hooks/services, enforced as a hard import boundary. *A route
that does math is a 500-line `useEffect`.*)

```
        HTTP (Nginx ─▶ Uvicorn)
              ▼
  ┌──────────────────────────────────────────────────────────┐
  │ API / routers   app/api/v1/routers/*.py                   │
  │ validate (Pydantic) → resolve Depends → call ONE service  │   NO SQL · NO math · NO pandas
  └───────────────┬──────────────────────────────────────────┘
                  ▼
  ┌──────────────────────────────────────────────────────────┐
  │ SERVICE   app/services/*.py                               │
  │ business rules: net/gross/returns(qty<0), discount,       │
  │ period-over-period deltas, cascade, ranking. Shapes DTOs. │
  └───────────────┬──────────────────────────────────────────┘
                  ▼
  ┌──────────────────────────────────────────────────────────┐
  │ REPOSITORY   app/repositories/*.py   (the ONLY SQL)       │
  │ SQLAlchemy 2.0 select() + TimescaleDB time_bucket() over  │
  │ olabi_sales, joins to olabi_stores / olabi_dim_table.     │
  └───────────────┬──────────────────────────────────────────┘
                  ▼
  ┌──────────────────────────────────────────────────────────┐
  │ READ MODELS / DB   app/models/*.py + app/db/              │
  │ SQLAlchemy classes MAPPED to EXISTING tables (no DDL,     │
  │ no Alembic). Async engine to Unicorn — READ ONLY.         │
  └──────────────────────────────────────────────────────────┘

  CROSS-CUTTING: app/core/ (config, logging, exceptions, middleware,
  pagination, scope seam) · app/schemas/ (Pydantic v2 DTOs)
```

**`backend/` tree we build toward** (no `alembic/`, no import/ETL — read-only):

```
backend/
├── plan.md · README.md
├── docs/SPEC.md                # M1 functional spec (data dictionary + KPI/filter contract)
├── app/
│   ├── main.py                 # app factory: routers, middleware, exception handlers, lifespan
│   ├── api/v1/
│   │   ├── router.py           # APIRouter(prefix="/api/v1")
│   │   └── routers/            # health, analytics, trends, breakdowns, products,
│   │                            # transactions, search, filters(+cascade), export
│   ├── schemas/                # Pydantic v2: common(Page[T],Error), filters(AnalyticsFilters), DTOs
│   ├── services/               # business logic
│   ├── repositories/           # the ONLY SQL: base + sales_repository, dim_repository
│   ├── models/                 # read-only ORM mapped to olabi_sales, olabi_stores, olabi_dim_table
│   ├── db/                     # engine.py (async, read-only) + session.py (get_db dep)
│   └── core/                   # config, logging, exceptions, exception_handlers, middleware,
│                                # pagination, scope.py (ebo_rls_access seam)
├── tests/   (conftest, unit/, integration/)
├── Dockerfile · docker-compose.yml · nginx/        # deployment only
├── .env.example · .dockerignore · pyproject.toml
```

> `models/` = DB shape (mapped to existing tables); `schemas/` = API shape. Never return an ORM row from
> a route — always map to a Pydantic DTO.

**v1 endpoints** (all `/api/v1`, read-only, all take the shared `AnalyticsFilters`):
`/health` · `/analytics/summary` (KPIs + deltas) · `/analytics/trend` (day/week `time_bucket`) ·
`/breakdowns/{store|category|brand|channel|salesperson}` · `/products` + `/products/{code}` ·
`/transactions` (Page[T]) · `/search?q=` · `/filters/options` + `/filters/salespeople?store=…` ·
`/export/transactions.csv` (streaming).

---

## 4. Roadmap (18 milestones · ~1–3 h each)

Each milestone: **Objective · Concepts (JS analogy) · Files · Why · Best practices · Common mistakes ·
Enterprise standard.**

> JS→Python: `venv` ~ node_modules · `pyproject.toml`+pip ~ package.json+npm · uvicorn ~ `node server` ·
> **Pydantic ~ Zod** · **SQLAlchemy ~ Prisma/TypeORM (query-only here)** · `Depends` ~ Nest DI · pytest ~
> Jest · ruff/mypy ~ ESLint/tsc.

**Stage A — Foundations**
- **M1 · Orientation: prototype + warehouse recon (1.5h).** Produce `docs/SPEC.md` (KPI/filter checklist +
  column→endpoint map; store join = `olabi_stores`; channel/brand semantics). *Standard:* written behavioral source-of-truth. **(delivered)**
- **M2 · Python env + first FastAPI `/health` (2h).** `pyproject.toml`, minimal `app/main.py`, `.gitignore`.
- **M3 · Project structure + app factory + versioned router (2h).** `app/` skeleton + `create_app()` + `api/v1/router.py`.
- **M4 · Config with pydantic-settings (1.5h).** Typed env config incl. the read-only Unicorn DSN; `.env`/`.env.example`.

**Stage B — Read-only DB connectivity**
- **M5 · SQLAlchemy 2.0 async engine + read-only session/DI (2h).** `db/engine.py`, `db/session.py`; enforce
  read-only transactions; pool + `statement_timeout` from settings; prove a SELECT from `olabi_sales`.
- **M6 · Read-only models mapped to existing tables (2h).** Map `olabi_sales`, `olabi_stores`,
  `olabi_dim_table` — no DDL, no Alembic. Model only queried columns; handle `real` money.

**Stage C — Query + business logic (the core)**
- **M7 · Repository + TimescaleDB aggregation (3h).** `sales_repository` with `time_bucket` + `GROUP BY`,
  money summed as `::numeric`. Never pull rows into Python; date filter always present (chunk pruning).
- **M8 · Pydantic v2 schemas / DTOs (2h).** Shared `AnalyticsFilters` + response DTOs; validate at the edge.
- **M9 · Service layer — KPIs + deltas (3h).** net/gross(excl. returns)/returns/discount; previous-equal-
  window deltas; distinct customers via `consumer_mobile`.
- **M10 · Routes & versioning `/api/v1` (2.5h).** `/health`, `/analytics/summary`, `/analytics/trend`.

**Stage D — Dashboard parity**
- **M11 · Breakdowns (3h).** store/category(+units)/brand/channel/salesperson; salesperson excludes EC.
- **M12 · Product gallery + drill-down (3h).** image+`varientcount` from `olabi_dim_table`; `/products/{code}`.
- **M13 · Transactions + filtering/pagination/sorting (3h).** One reusable filter dep; sort whitelist; capped pages.
- **M14 · Search + cascading staff filter + streaming CSV (3h).** product/sku/invoice search; store→staff cascade; `StreamingResponse`.

**Stage E — Cross-cutting, quality, delivery**
- **M15 · Exceptions + structured logging (2h).** Domain exceptions + one error envelope; JSON logs +
  request-id; **mask PII**.
- **M16 · Testing — SKIPPED** (user decision). Each milestone was instead verified live against the warehouse + mypy/ruff, with endpoint numbers cross-validated against the prototype.
- **M17 · Containerize + compose + Nginx (3h).** Multi-stage non-root image; deploy-only. The Unicorn warehouse is EXTERNAL (not a compose service).
- **M18 · CI with GitHub Actions (2h).** ruff + mypy gate (no pytest, per M16 skip).

**Later epics (designed-for, not built now):** per-user store scoping via `ebo_rls_access`
(`core/scope.py`); customer-360 from `cust_master_profile`; targets vs actuals from `ebo_store_target`;
frontend (Next.js 15 / React 19 / TS / Tailwind / shadcn / TanStack Query / RHF + Zod mirroring
`AnalyticsFilters`).

---

## 5. Working agreement
- **One milestone at a time.** I give it; you build; you say **DONE**. On DONE I review, name mistakes
  and why they matter, then unlock the next. We don't advance until the current one is solid.
- **Code rules:** never a large dump — **one file at a time**, every line explained, every import
  justified, every placement reasoned.
- **Always:** Clean Architecture · SOLID · DRY · KISS · Repository + Service layers · env config ·
  structured logging · centralized error handling · typed Python · 100% Pydantic at the boundary ·
  **no business logic in routes** · **read-only — never write to the warehouse**.

### Code Navigability Standard (Ctrl-click flows route → service → repository → query → model)
The whole codebase is written so a single **Go to Definition** (Ctrl/Cmd-click in VS Code + Pylance)
walks the full call chain, page to page, with zero guessing:
1. **Everything is a named function/method — never an inline lambda for logic.** A route calls
   `await service.get_summary(filters)`; Ctrl-click `get_summary` jumps straight to the service method.
2. **Full type hints on every parameter and return value.** Types are what let the IDE resolve the
   symbol to jump to; an untyped return breaks the chain.
3. **Named DI providers** (`Depends(get_analytics_service)`, `Depends(get_db)`): Ctrl-click the provider
   to see exactly how a dependency is wired. No anonymous factories.
4. **Consistent verb names across layers** so the chain reads like one story:
   `router.get_summary` → `AnalyticsService.get_summary` → `SalesRepository.summary` → the named
   `select()` it builds → the mapped `OlabiSales` model column. One concept, one name, top to bottom.
5. **The SQL lives in one clearly-named repository method**, returning a typed row/DTO — so from any
   service you Ctrl-click into the method and immediately see the exact query against the table.
6. **Models are typed mapped classes**; columns are real attributes (`OlabiSales.nett_invoice_value`),
   so Ctrl-click on a column in a query jumps to its definition (and its DB type).
7. **Docstrings name the next hop** (e.g. a service docstring says "delegates to `SalesRepository.summary`")
   so even reading top-down you always know where to click next.
The payoff: open a route, and you can click your way to the precise DB query and back without searching.

## 6. Verification
- `/api/v1/health` pings Unicorn → 200; a bad DSN crashes at boot.
- App issues **only** read-only transactions — no DDL/INSERT/UPDATE ever.
- **Correctness:** filter `olabi_sales` to the CSV's EBO window and match `/analytics/summary` +
  breakdowns to what `index.html` shows.
- **Performance:** date-filtered queries chunk-prune; aggregation in Postgres; low p95 on 1.41M rows.
- **Quality/delivery:** `pytest` green; ruff/mypy clean; `docker compose up` serves via Nginx; CI gates a PR.

**Status: BACKEND COMPLETE ✅ — M1–M15 + M17–M18 done (M16 testing skipped by choice).
45 files · mypy --strict clean · ruff clean · 11 endpoints live against the Unicorn warehouse.
Next epic: the Next.js frontend (Stage G), or start with `git init` + push (CI) / `docker compose up` (deploy).**
