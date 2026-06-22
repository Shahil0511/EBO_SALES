# Libas · Sales Intelligence

A premium, self-contained analytics portal for `EBO_SALES.csv`
(173,515 line items · ₹29.77 Cr net · 13,081 products · 53 stores · Apr 1 – Jun 21, 2026).

## Files

| File         | What it is |
|--------------|------------|
| `index.html` | The portal. **Just open it in a browser** — all data is embedded; no server needed. (Product images load from your Shopify/Myntra CDNs, so that part needs internet.) |
| `app.py`     | Optional backend for when you connect a database. Serves the same data so nothing else changes. |
| `README.md`  | This file. |

## Using it now (standalone)

Double-click `index.html`. Open it **locally** rather than through the in-chat
preview — it carries the full dataset (~4.5 MB) and decompresses it in the
browser on load.

## What's in this version

**1 · Image-wise product sales.** A **Products** gallery shows every product as
an image card, grouped by **`product_code`** (the parent SKU, e.g. `401254`),
with its category, number of size variants, units sold and net revenue. Sort by
**Revenue**, **Units sold**, or **Returns**; click a card to filter the whole
dashboard to that product. Images come straight from the `imageUrl` column.

**2 · Returns broken out.** Negative quantities are treated as returns and
reported separately: **Gross sales**, **Returns** (value + units, in rust), and
**Net revenue** are distinct KPIs. The Products gallery has a Returns ranking,
and the transactions table tags every return line. (In this file: gross
₹31.04 Cr, returns ₹1.27 Cr / 6,519 units, net ₹29.77 Cr.)

**3 · Cascading staff filter.** Select **all** stores and you see all 317 staff;
select specific stores and the **Sales staff** list narrows to just the people
who sell at those stores, with counts recomputed for that scope.

**4 · Dynamic quantity filter.** The min/max bounds read from the data
automatically (currently −4 to 36) and are **not** hard-coded — if a future load
has larger quantities, the filter adapts. Quick chips: All / Sales (≥1) /
Returns (<0).

Plus everything else: filters for date/month, store, brand, category and
channel (searchable multi-selects); top-bar search across **product code, SKU
and invoice**; period-over-period KPI deltas; revenue trend (daily/weekly); top
stores; category mix; brand & channel splits; top staff; a sortable, paginated
transactions table (with a product thumbnail + `product_code` column); click an
invoice to isolate it; and CSV export of the filtered rows (including
`product_code`, `imageUrl` and `consumer_first_bill_date`).

> **On `consumer_first_bill_date`:** it is kept exactly as it appears in your
> file — raw values, original meaning, never converted or relabelled. (An earlier
> draft mislabelled it "Pincode"; that's fixed.)

## Automating it with PostgreSQL / MS SQL Server

The portal computes everything in the browser from one data snapshot. To feed
that snapshot from a database instead of the embedded copy:

1. Put `EBO_SALES.csv` next to `app.py` (or wire up your DB — see below).
2. Install and run the backend:
   ```bash
   pip install fastapi "uvicorn[standard]" pandas
   python app.py
   ```
3. In `index.html`, change one line:
   ```js
   const DATA_SOURCE = 'api';   // was 'embedded'
   ```
4. Open <http://127.0.0.1:8000/>.

To switch the source from the CSV to your database, change **one line** at the
bottom of `app.py`:
```python
SOURCE = load_from_csv        # -> load_from_postgres  /  load_from_mssql  /  load_from_duckdb
```
`load_from_postgres()` and `load_from_mssql()` are already written — install the
driver, paste your connection string, and you're live. The `SQL_PULL` query in
`app.py` is the exact SELECT your table needs to return (all 23 columns,
including `product_code`, `imageUrl`, and `consumer_first_bill_date`);
everything downstream is handled for you.

> Scaling: this hands the whole table to the browser once (ideal up to a few
> hundred thousand rows). If your data grows into the millions, move the
> aggregation into SQL and return rollups — `SQL_PULL` is the place to start.

## A note on customer data

The transactions table shows customer name and mobile. That's fine for an
internal tool, but the standalone HTML is a shareable file — for production,
serve customer fields from the access-controlled backend (`app.py`) rather than
embedding them, so PII stays behind your auth.
