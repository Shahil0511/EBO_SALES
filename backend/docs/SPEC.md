# LIBAS Sales Intelligence — Functional Spec (M1)

The behavioral source-of-truth for the read-API. Every formula here is reverse-engineered from the
prototype `index.html` (the `aggregate()` / `renderKPIs()` engine) and validated against the live
`public.olabi_sales` table. When we build each endpoint, its numbers must match this spec, and we
cross-check against the prototype for the same filters.

---

## 1. Source of record

- **Fact:** `public.olabi_sales` — TimescaleDB hypertable on `invoice_date` (253 chunks).
  **1,413,608 rows · 36,466 returns · 2021‑08‑21 → 2026‑06‑22.**
- **Grain:** one row = one **invoice line item**. `invoice_no` is the header (many lines per invoice).
- **Money columns are `real` (float)** → in SQL, sum as `SUM(col::numeric)`; round at the API edge.
- **Returns** = rows where `total_sales_qty < 0` (their money columns are ≤ 0).
- **Store dimension:** `public.ebo_store_master` (now readable; 32 cols: `store_code`, `store_name`,
  `region`, `state`, `city`, `cluster`, `store_type`, managers, lat/long, …), via **LEFT JOIN**
  `olabi_sales.invoice_associate_code = ebo_store_master.store_code`. **53 of 57** store codes match;
  the 4 unmatched (warehouse/online pseudo-stores) fall back to `invoice_associate_name` / `store_city`.
  This unlocks extra breakdowns: **by region (5), city (24), cluster (4), store type**.
  *(`olabi_stores` remains the canonical `store_code`↔`store_name` list.)*
- **Product image / variant count:** `public.olabi_dim_table` — `parentStyleNo` (= `product_code`) →
  `imageurl`, `varientcount`.
- **Channels:** `business_channel_code` — `BM` = offline store (96.8% of rows), `EC` = online
  (salesperson is blank on EC).

## 2. Data dictionary (`olabi_sales`, 29 cols → usage)

| Column | Type | Used as |
|--------|------|---------|
| `invoice_associate_code` / `_name` | varchar | Store key / label (→ `olabi_stores`) |
| `invoice_date` | timestamp | Time axis; all date filters & trend `time_bucket` |
| `brand_name` | varchar | Brand dimension (6) |
| `category_name` | varchar | Category dimension (45) |
| `product_code` | varchar | Parent product/style (gallery grouping; search) |
| `product_sku_code` | varchar | Variant (search; table) |
| `hsn_code`, `barcode` | varchar | (not in dashboard; available) |
| `total_sales_qty` | numeric | Units; **< 0 ⇒ return** |
| `unit_mrp` | real | (table) |
| `invoice_mrp_value` | real | Σ → MRP base (discount-rate denominator) |
| `invoice_discount_value` | real | Σ → discount (discount-rate numerator) |
| `invoice_basic_value`, `invoice_tax_value` | real | (available; not a headline KPI) |
| `nett_invoice_value` | real | **The revenue measure** (net of discount); Σ everywhere |
| `invoice_no` | varchar | Invoice count (distinct); search; table link |
| `business_channel_code` | varchar | Channel dimension (BM/EC) |
| `sales_person_code` / `_name` | varchar | Salesperson dimension (blank on EC) |
| `consumer_name` / `_mobile` / `_e_mail` / `_pincode` | varchar | Customer (PII — mask in logs) |
| `consumer_first_bill_date` | date | Table column (kept raw) |
| `store_city` | varchar | Store enrichment |
| `invoice_offer_description` | varchar | (available) |
| `order_associate_code` / `_name` | varchar | (available; online order-taker) |

## 3. KPI definitions (exact, from the prototype)

Over the **filtered** row set. Let `nett = nett_invoice_value`, `qty = total_sales_qty`.

| KPI | Formula |
|-----|---------|
| **Net revenue** | `SUM(nett)` over all filtered rows |
| **Gross sales** | `SUM(nett) WHERE qty >= 0` (positive lines only) |
| **Returns (value)** | `-SUM(nett) WHERE qty < 0` (reported as a positive magnitude) |
| **Units sold** | `SUM(qty) WHERE qty >= 0` |
| **Units returned** | `-SUM(qty) WHERE qty < 0` |
| **Net units** | `SUM(qty)` (all; = sold − returned) |
| **Invoices** | `COUNT(DISTINCT invoice_no)` |
| **Customers** | `COUNT(DISTINCT consumer_mobile)` (mobile is the identity key; ignore blanks) |
| **Discount rate** | `SUM(invoice_discount_value) / NULLIF(SUM(invoice_mrp_value),0) * 100` |

> Note: the prototype derives **gross from `nett` of positive-qty rows** (not from `mrp`). We match the
> prototype exactly for parity. (`net = gross − returns_value`.)

**Period-over-period deltas** (shown on Net revenue & Invoices): compute the same KPI over the
**previous window of identical length** ending the day before the selected range starts;
`delta% = (cur − prev) / |prev| * 100`. If there's no prior window in range, show no delta.

## 4. Breakdowns (all = `SUM(nett::numeric)` grouped, unless noted)

| Breakdown | Group by | Extra |
|-----------|----------|-------|
| Trend | `time_bucket('1 day'|'1 week', invoice_date)` | day/week toggle |
| Store | store (`invoice_associate_*`) | top-N + share%; LEFT JOIN `ebo_store_master` for region/city/cluster/type |
| Region / City / Cluster | `ebo_store_master.region` / `city` / `cluster` | new — enabled by store-master access |
| Category | `category_name` | **+ units** (`SUM(qty)`) |
| Brand | `brand_name` | donut share% |
| Channel | `business_channel_code` | donut (BM=Retail, EC=E-commerce) |
| Salesperson | `sales_person_*` | **EC excluded** (blank staff) |
| Product gallery | `product_code` | revenue=`SUM(nett)`, units=`SUM(qty)`, returns=`-SUM(qty WHERE qty<0)`; join `olabi_dim_table` for image + `varientcount`; rank by revenue\|units\|returns |

## 5. Filters (shared `AnalyticsFilters`)

- **Date range:** presets (last 7/30, by month, all) or custom `from`/`to` (inclusive).
- **Multi-select:** store, brand, category, channel, salesperson, product (empty = all).
- **Quantity:** `qty_min` / `qty_max` (per line); quick chips All / Sales (≥1) / Returns (<0).
- **Search** (`q`): case-insensitive substring match across `product_code`, `product_sku_code`,
  `invoice_no`.
- **Cascading staff:** the salesperson option list is restricted to staff with sales in the selected
  store(s); counts recomputed within that store scope; empty/irrelevant for EC.

## 6. Transactions table & export

- **Table:** filtered line items, paginated + sortable on date/invoice/sku/product/qty/mrp/disc/net.
  Columns: date, invoice, product (+thumb), sku, store, channel, category, brand, qty (returns tagged),
  mrp, disc, net, salesperson, customer, mobile, first-bill-date.
- **Export CSV** (streaming): the filtered rows with the same fields + `imageUrl`.

## 7. Endpoint ↔ source map (v1)

| Endpoint | Source / logic |
|----------|----------------|
| `GET /health` | DB ping (`SELECT 1`) |
| `GET /analytics/summary` | §3 KPIs + deltas |
| `GET /analytics/trend` | §4 trend (day/week) |
| `GET /breakdowns/{dim}` | §4 store/category/brand/channel/salesperson |
| `GET /products`, `/products/{code}` | §4 gallery + `olabi_dim_table`; variants for one product |
| `GET /transactions` | §6 table (paged/sorted) |
| `GET /search?q=` | §5 search |
| `GET /filters/options`, `/filters/salespeople?store=` | distinct dimension values; §5 cascade |
| `GET /export/transactions.csv` | §6 export (stream) |

## 8. Acceptance checklist (parity)

Pick a filter set (e.g. EBO window Apr 1 – Jun 21 2026, all stores) and confirm the API matches the
prototype for: net revenue · gross · returns (value + units) · invoices · units · customers ·
discount rate · the 5 breakdowns · product gallery ranking · transactions count · cascade list · CSV.

## 9. Open items (confirm during the build)
- Confirm whether the dashboard should cover **BM+EC** (current assumption) or BM-only (offline).
- `consumer_mobile` blanks/format: define the distinct-customer normalization (digits, drop `91`/`0`).
- Store-scoping via `ebo_rls_access`: build the seam now, enable when Data Nexus forwards user email.
