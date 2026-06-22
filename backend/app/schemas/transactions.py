"""Schemas for the transactions table (GET /api/v1/transactions).

`TransactionSortKey` is imported from the repository: the data layer owns which columns
are sortable (it maps them to real columns in a whitelist), and the request model just
exposes that vocabulary.
"""

from datetime import date, datetime
from typing import Literal

from pydantic import Field

from app.repositories.sales_repository import TransactionSortKey
from app.schemas.common import APIModel
from app.schemas.filters import AnalyticsFilters


class TransactionsQuery(AnalyticsFilters):
    """Filters + pagination + sort, as one query-parameter model."""

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)
    sort_key: TransactionSortKey = "date"
    sort_dir: Literal["asc", "desc"] = "desc"


class TransactionRowOut(APIModel):
    """One line item row in the table. `first_bill_date` is kept raw (SPEC)."""

    invoice_date: datetime
    invoice_no: str | None
    product_code: str | None
    sku: str | None
    store: str | None
    channel: str | None
    category: str | None
    brand: str | None
    qty: int
    mrp: float
    discount: float
    net: float
    salesperson: str | None
    customer: str | None
    mobile: str | None
    first_bill_date: date | None
