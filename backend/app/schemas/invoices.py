"""Schemas for the invoice (bill) detail endpoint
(GET /api/v1/transactions/invoice/{invoice_no})."""

from datetime import datetime

from app.schemas.common import APIModel


class InvoiceLine(APIModel):
    """One line item on the bill (the header carries the shared store/customer/date)."""

    product_code: str | None
    image_url: str | None = None
    sku: str | None
    category: str | None
    brand: str | None
    qty: int
    mrp: float
    discount: float
    net: float


class InvoiceDetailResponse(APIModel):
    """A full invoice: header (store/channel/customer/date/totals) + its line items."""

    invoice_no: str
    date: datetime
    store: str | None
    channel: str | None
    customer: str | None
    mobile: str | None
    salesperson: str | None
    total_net: float
    total_qty: int
    line_count: int
    lines: list[InvoiceLine]
