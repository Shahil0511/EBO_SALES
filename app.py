

from __future__ import annotations
import json, gzip, io, os
import pandas as pd

# ---------------------------------------------------------------------------
# 1) CONFIG
# ---------------------------------------------------------------------------
HERE      = os.path.dirname(os.path.abspath(__file__))
CSV_PATH  = os.path.join(HERE, "EBO_SALES.csv")
HTML_PATH = os.path.join(HERE, "index.html")
DATE_FMT  = "%d-%m-%Y %H:%M"           # invoice_date format in the source

# The 23 source columns, in order.  When you move to a database, this is the
# SELECT list your query must return (alias columns to match these names).
# NOTE: consumer_first_bill_date is kept verbatim — it is NOT a pincode and is
# never converted.
SQL_PULL = """
    SELECT
        invoice_associate_code,
        invoice_associate_name,
        invoice_date,
        brand_name,
        category_name,
        product_code,               -- parent SKU  (e.g. 401254)
        product_sku_code,           -- variant w/ size/attribute (e.g. 401254M)
        total_sales_qty,            -- negative = return
        unit_mrp,
        invoice_mrp_value,
        invoice_discount_value,
        invoice_basic_value,
        invoice_tax_value,
        nett_invoice_value,
        Invoice_no,
        Business_Channel_Code,
        Sales_Person_Code,
        Sales_Person_Name,
        consumer_name,
        consumer_mobile,
        consumer_e_mail,
        consumer_first_bill_date,   -- kept as-is, never interpreted
        imageUrl                    -- product image (Shopify / Myntra CDN)
    FROM ebo_sales
"""

# ---------------------------------------------------------------------------
# 2) SNAPSHOT BUILDER  (dataframe -> the columnar JSON the portal consumes)
#    Dictionary-encodes every dimension. pandas.Categorical keeps categories
#    SORTED, so the day dictionary is chronological — the portal relies on this
#    for its date-range binary search. Do not change the encoding.
# ---------------------------------------------------------------------------
def build_snapshot(df: pd.DataFrame) -> dict:
    df = df.copy()
    d = pd.to_datetime(df["invoice_date"], format=DATE_FMT, errors="coerce")

    def dictenc(series):
        cats = pd.Categorical(series.astype(str))
        return list(map(str, cats.categories)), cats.codes.astype("int32")

    store_name = df["invoice_associate_name"].replace("", "Unknown")
    store_dict, store_idx = dictenc(store_name)
    name2code = df.groupby("invoice_associate_name")["invoice_associate_code"].first().to_dict()
    store_codes = [name2code.get(n, "") for n in store_dict]

    brand_dict, brand_idx = dictenc(df["brand_name"].replace("", "Unknown"))
    cat_dict,   cat_idx   = dictenc(df["category_name"].replace("", "Unknown"))
    chan_dict,  chan_idx  = dictenc(df["Business_Channel_Code"].replace("", "NA"))
    sp_dict,    sp_idx    = dictenc(df["Sales_Person_Name"].replace("", "Unknown"))
    sku_dict,   sku_idx   = dictenc(df["product_sku_code"].replace("", "NA"))
    inv_dict,   inv_idx   = dictenc(df["Invoice_no"].replace("", "NA"))
    prod_dict,  prod_idx  = dictenc(df["product_code"].replace("", "NA"))
    day_dict,   day_idx   = dictenc(d.dt.strftime("%Y-%m-%d"))

    # product (parent) -> representative image, dominant category, variant count
    img_by_prod = (df.groupby("product_code")["imageUrl"]
                     .apply(lambda s: next((x for x in s if str(x).strip()), "")).to_dict())
    prod_img = [img_by_prod.get(p, "") for p in prod_dict]
    pc_cat = (df.groupby("product_code")["category_name"]
                .agg(lambda s: s.mode().iat[0] if len(s.mode()) else "").to_dict())
    cat_to_i = {c: i for i, c in enumerate(cat_dict)}
    prod_cat = [cat_to_i.get(pc_cat.get(p, ""), 0) for p in prod_dict]
    sku_per_prod = df.groupby("product_code")["product_sku_code"].nunique().to_dict()
    prod_skus = [int(sku_per_prod.get(p, 0)) for p in prod_dict]

    def numi(col):
        return pd.to_numeric(df[col], errors="coerce").fillna(0).round().astype("int32")
    qty = pd.to_numeric(df["total_sales_qty"], errors="coerce").fillna(0).astype("int32")
    net, disc, mrp = numi("nett_invoice_value"), numi("invoice_discount_value"), numi("invoice_mrp_value")

    # customer identity keyed on mobile (fallback to name); cfbd = consumer_first_bill_date (kept raw)
    cname = df["consumer_name"].astype(str).str.strip().replace("nan", "")
    cmob  = df["consumer_mobile"].astype(str).replace("NULL", "").replace("nan", "")
    cfbd  = df["consumer_first_bill_date"].astype(str).replace("NULL", "").replace("nan", "")
    cust_key = cmob.where(cmob != "", "n:" + cname)
    ckeys, cust_idx = dictenc(cust_key)
    tmp = pd.DataFrame({"k": cust_key.values, "name": cname.values, "mob": cmob.values, "cfbd": cfbd.values})
    agg = tmp.groupby("k").agg(
        name=("name", "first"), mob=("mob", "first"),
        cfbd=("cfbd", lambda s: next((x for x in s if x), "")),
    )
    cust_name = [agg.loc[k, "name"] if k in agg.index else "" for k in ckeys]
    cust_mob  = [agg.loc[k, "mob"]  if k in agg.index else "" for k in ckeys]
    cust_cfbd = [agg.loc[k, "cfbd"] if k in agg.index else "" for k in ckeys]

    return {
        "meta": {"n": int(len(df)),
                 "minDay": min(day_dict) if day_dict else None,
                 "maxDay": max(day_dict) if day_dict else None,
                 "qtyMin": int(qty.min()), "qtyMax": int(qty.max())},
        "dim": {"store": store_dict, "storeCode": store_codes, "brand": brand_dict,
                "cat": cat_dict, "chan": chan_dict, "sp": sp_dict, "day": day_dict,
                "prod": prod_dict},
        "prodImg": prod_img, "prodCat": prod_cat, "prodSkus": prod_skus,
        "sku": sku_dict, "inv": inv_dict,
        "cust": {"name": cust_name, "mob": cust_mob, "cfbd": cust_cfbd},
        "col": {"store": store_idx.tolist(), "brand": brand_idx.tolist(), "cat": cat_idx.tolist(),
                "chan": chan_idx.tolist(), "sp": sp_idx.tolist(), "day": day_idx.tolist(),
                "sku": sku_idx.tolist(), "inv": inv_idx.tolist(), "cust": cust_idx.astype("int32").tolist(),
                "prod": prod_idx.tolist(), "qty": qty.tolist(), "net": net.tolist(),
                "disc": disc.tolist(), "mrp": mrp.tolist()},
    }

# ---------------------------------------------------------------------------
# 3) DATA SOURCES  — each returns a DataFrame with the 23 source columns
# ---------------------------------------------------------------------------
def load_from_csv() -> pd.DataFrame:
    """Default. Zero extra dependencies."""
    return pd.read_csv(CSV_PATH, keep_default_na=False)


def load_from_duckdb() -> pd.DataFrame:
    """
    Optional: query the CSV with SQL via DuckDB (a useful stepping stone to a
    real warehouse, since the SQL is close to Postgres/MSSQL).
        pip install duckdb
    """
    import duckdb
    con = duckdb.connect()
    con.execute(f"CREATE VIEW ebo_sales AS SELECT * FROM read_csv_auto('{CSV_PATH}', header=true)")
    return con.execute(SQL_PULL).df()


def load_from_postgres() -> pd.DataFrame:
    """
    PostgreSQL.   pip install "psycopg[binary]" pandas
    Fill in your DSN. SQL_PULL already selects the right columns. Postgres is
    case-folding, so unquoted identifiers like Invoice_no resolve fine as long
    as your column names match (case-insensitively).
    """
    import psycopg
    DSN = "host=localhost port=5432 dbname=retail user=postgres password=postgres"
    with psycopg.connect(DSN) as con:
        return pd.read_sql(SQL_PULL, con)


def load_from_mssql() -> pd.DataFrame:
    """
    MS SQL Server.   pip install pyodbc pandas   (+ ODBC Driver 18 for SQL Server)
    MSSQL is case-insensitive for identifiers by default; SQL_PULL works as-is.
    If your table lives in a schema, qualify it (e.g. FROM dbo.ebo_sales).
    """
    import pyodbc
    CONN = (
        "DRIVER={ODBC Driver 18 for SQL Server};"
        "SERVER=localhost,1433;DATABASE=retail;UID=sa;PWD=Your_password123;"
        "TrustServerCertificate=yes;"
    )
    with pyodbc.connect(CONN) as con:
        return pd.read_sql(SQL_PULL, con)

# ---------------------------------------------------------------------------
# 4) PICK YOUR SOURCE HERE
# ---------------------------------------------------------------------------
SOURCE = load_from_csv      # <- swap to load_from_postgres / load_from_mssql / load_from_duckdb

# ---------------------------------------------------------------------------
# 5) WEB SERVER  (FastAPI). Caches the snapshot in memory; POST /api/refresh to rebuild.
# ---------------------------------------------------------------------------
from fastapi import FastAPI, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Libas Sales Intelligence API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_cache: dict | None = None
def snapshot() -> dict:
    global _cache
    if _cache is None:
        print(f"[snapshot] building from {SOURCE.__name__} …")
        _cache = build_snapshot(SOURCE())
        m = _cache["meta"]
        print(f"[snapshot] {m['n']:,} rows · {len(_cache['dim']['prod']):,} products "
              f"({m['minDay']} -> {m['maxDay']}) ready")
    return _cache

@app.get("/")
def root():
    return FileResponse(HTML_PATH)

@app.get("/api/snapshot")
def api_snapshot():
    body = json.dumps(snapshot()).encode("utf-8")
    buf = io.BytesIO()
    with gzip.GzipFile(fileobj=buf, mode="wb", compresslevel=6) as gz:
        gz.write(body)
    return Response(buf.getvalue(), media_type="application/json",
                    headers={"Content-Encoding": "gzip"})

@app.post("/api/refresh")
def api_refresh():
    global _cache; _cache = None
    return JSONResponse({"ok": True, "rows": snapshot()["meta"]["n"]})

@app.get("/api/health")
def health():
    return {"status": "ok", "source": SOURCE.__name__}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
