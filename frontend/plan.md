# LIBAS Sales Intelligence — Frontend Epic (Next.js Dashboard)

> Companion to `backend/plan.md`. The backend is complete (read-only API over the Unicorn
> warehouse, `/api/v1`, OpenAPI 3.1). This epic rebuilds the prototype `index.html` as a
> production Next.js app consuming that API. Lives in `D:\LIBAS\files\frontend\`.
> Same cadence: milestone by milestone, gated by **DONE**.

## Context

The prototype dashboard was one 4.3 MB HTML file that embedded the whole dataset and did all
aggregation in the browser. We moved every computation server-side (M1–M18). Now the frontend
becomes a **thin, typed client**: it holds filter state, calls small endpoints, and renders —
no business logic, no data crunching. You're an expert in this stack, so this plan is light on
React/Next basics and heavy on the **integration**: the typed contract, TanStack Query patterns,
URL-driven filter state, and porting each dashboard section.

## Final stack
Next.js 15 (App Router) · React 19 · TypeScript · TailwindCSS · shadcn/ui · TanStack Query v5 ·
React Hook Form + Zod · TanStack Table (transactions) · Recharts (charts).

## Key decisions (stated; correct me anytime)
1. **Location:** `frontend/` sibling to `backend/`.
2. **Dev API connection = Next.js rewrites proxy.** `next.config` rewrites `/api/v1/:path*` →
   `${API_PROXY_TARGET}` (default `http://localhost:8000`). The browser calls **same-origin**
   `/api/v1`, so **no CORS** is needed and the backend stays untouched. In prod, Nginx already
   proxies `/api/` to the API — same-origin there too.
3. **Types from the contract, not by hand.** `openapi-typescript` generates `src/lib/api/schema.d.ts`
   from the backend's `/openapi.json`; `openapi-fetch` gives a tiny typed client. An npm script
   `gen:api` regenerates it. **Zod** is used for the *filter form* (client-side UX validation),
   mirroring the `AnalyticsFilters` request shape — the one place we hand-author a schema.
4. **Filters live in the URL** (`?dateFrom=…&stores=…&rankBy=…`). The query string is the single
   source of filter truth — shareable, back-button friendly, and a 1:1 mirror of the backend's
   `AnalyticsFilters`. Every data hook keys its TanStack Query on the parsed filters, so one filter
   change refetches everything (exactly how the backend filter changes every number).
5. **₹ formatting** matches the prototype: Indian grouping + lakh/crore (`₹29.77 Cr`, `₹1.27 L`).
6. **Look:** port the prototype's premium aesthetic (maroon `#7B2D43` / rust / cream, Fraunces +
   IBM Plex) as Tailwind theme tokens + shadcn variants.

## Architecture
```
frontend/
├── src/
│   ├── app/                      # App Router: layout.tsx, page.tsx (the dashboard), providers
│   ├── components/
│   │   ├── ui/                   # shadcn primitives
│   │   ├── filters/              # filter rail (date, multiselects, qty, search, cascade)
│   │   ├── kpis/ charts/ products/ transactions/   # dashboard sections
│   │   └── layout/               # header, rail shell, chips
│   ├── lib/
│   │   ├── api/                  # schema.d.ts (generated), client.ts (openapi-fetch), hooks/
│   │   ├── filters.ts            # URL <-> AnalyticsFilters parse/serialize + Zod form schema
│   │   ├── format.ts             # inr(), num(), date formatting (lakh/crore)
│   │   └── query.ts              # TanStack Query client + keys
│   └── styles / tailwind config  # theme tokens
├── next.config.ts                # /api/v1 rewrite proxy
├── .env.local / .env.example     # API_PROXY_TARGET
├── package.json · tsconfig · eslint/prettier · Dockerfile · .dockerignore
```
Data flow: **URL search params → `useFilters()` → TanStack Query hook (keyed on filters) →
typed `openapi-fetch` client → `/api/v1/...` → render.** No state duplication; the URL is the store.

---

## Roadmap (13 milestones)

### Stage A — Foundation & contract
**F1 · Scaffold + dev proxy (1–2h).** `create-next-app` (TS, Tailwind, App Router, ESLint) →
add Prettier; `next.config` rewrite `/api/v1/:path*` → `API_PROXY_TARGET`; `.env.local`. *Verify:*
a stub page fetches `/api/v1/health` through the proxy → `{status:"ok"}`.

**F2 · shadcn/ui + app shell + theme (2h).** `shadcn init`; add the Libas theme tokens (colors,
fonts); build the header (brand, global search slot, export slot) + the collapsible filter rail +
main grid — static shell, no data yet.

**F3 · Typed API layer (2h).** `openapi-typescript` + `openapi-fetch`; `gen:api` script (reads the
running backend's `/openapi.json`); `lib/api/client.ts` (typed client, base `/api/v1`); TanStack
Query provider in `app/providers.tsx`. *Verify:* a typed call to `/analytics/summary` returns a
fully-typed `SummaryResponse` (autocomplete on `netRevenue`, `netRevenueDelta.pctChange`).

### Stage B — Filters & data hooks
**F4 · URL-driven filter state (2h).** `lib/filters.ts`: parse/serialize the query string ↔ a typed
`Filters` object (mirrors `AnalyticsFilters`); a `useFilters()` hook (read + `setFilters` updating the
URL via `useRouter`/`useSearchParams`); the Zod form schema for the rail.

**F5 · The filter rail (3h).** Date range (presets + custom), multi-selects for store/brand/category/
channel (searchable, from `/filters/options`), qty min/max + chips, global search box; the
**cascading staff filter** (re-queries `/filters/salespeople` when stores change). RHF + Zod; on
submit, write to the URL. Active-filter chips + reset.

**F6 · Query hooks (2h).** `lib/api/hooks/`: `useSummary/useTrend/useBreakdown/useProducts/
useProductDetail/useTransactions/useSearch/useFilterOptions/useSalespeople`, each keyed on the
parsed filters. Centralized query keys; sensible `staleTime`.

### Stage C — Dashboard sections (parity with the prototype)
**F7 · KPI cards (2h).** Net revenue (hero + sparkline), gross, returns (value+units), invoices,
units, customers, discount rate — with period-over-period **delta** badges. `useSummary`.

**F8 · Charts (3h).** Revenue trend (day/week toggle, `useTrend`); store & category bars, brand &
channel donuts, salesperson bars, + region/city/cluster (`useBreakdown` per dimension). Recharts,
themed; click a bar/slice to add that filter.

**F9 · Product gallery + drill-down (3h).** Image cards (from `imageUrl`), ranking tabs
(revenue/units/returns), pagination (`Page[ProductCard]`); click → drill-down sheet showing variants
(`/products/{code}`). Lazy images + fallbacks.

**F10 · Transactions + search (3h).** TanStack Table wired to `/transactions` (server-side sort +
pagination, page-size select); the **global search** as a command-palette typeahead (`/search`),
results grouped by product/sku/invoice, selecting one sets a filter.

**F11 · Export + chips polish (1–2h).** Export button → triggers the streaming
`/export/transactions.csv` download with the current filters; finalize the active-filter chip bar.

### Stage D — Polish & delivery
**F12 · States, responsive, a11y, formatting (3h).** Skeletons/loading, empty states, error
boundaries that read the `{code,message,requestId}` envelope; mobile rail drawer; keyboard/focus;
the `inr()`/`num()` lakh-crore formatters everywhere.

**F13 · Dockerize + integrate + CI (2–3h).** Multi-stage Dockerfile (`next build` → `next start`);
add the `web` service to `docker-compose.yml`; Nginx serves the app and proxies `/api/`; a CI job
(lint + `tsc --noEmit` + `next build`). *Result:* `docker compose up` serves the whole stack.

---

## Working agreement (same as backend)
One milestone at a time; you say **DONE**; I review, then unlock the next. Code one file at a time,
explained. Standards: typed everything · the URL is the filter source of truth · no business logic in
components (it's in the API) · types generated from the contract · accessible, responsive, themed.

## Verification
- F1/F3: health + a typed summary call succeed through the proxy with full autocomplete.
- Per section: the rendered numbers match the API (and thus the prototype) for the same filters;
  changing a filter in the URL refetches and updates every section.
- F13: `docker compose up` serves the dashboard behind Nginx, same-origin with `/api/v1`.

**Status: roadmap drafted. Next: review, say DONE to start F1 (scaffold + dev proxy).**
