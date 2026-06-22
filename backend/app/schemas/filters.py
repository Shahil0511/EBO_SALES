"""AnalyticsFilters — the one request model every analytics endpoint accepts.

Mirrors the dashboard's filter panel (SPEC §5): a date range, multi-select dimension
filters, quantity bounds, and a free-text search term. Cross-field rules are checked
here so an invalid combination is rejected at the edge (HTTP 422), never in a service.
"""

from datetime import date
from typing import Self

from pydantic import Field, model_validator

from app.schemas.common import APIModel


class AnalyticsFilters(APIModel):
    # Date range is required — it is what lets TimescaleDB prune chunks on every query.
    date_from: date
    date_to: date

    # Multi-select dimensions. Empty list = "all" (no predicate added).
    stores: list[str] = Field(default_factory=list)
    brands: list[str] = Field(default_factory=list)
    categories: list[str] = Field(default_factory=list)
    channels: list[str] = Field(default_factory=list)
    salespersons: list[str] = Field(default_factory=list)
    products: list[str] = Field(default_factory=list)

    # Per-line quantity bounds (None = unbounded). Quick chips map to these.
    qty_min: int | None = None
    qty_max: int | None = None

    # Free-text search across product_code / sku / invoice_no.
    search: str | None = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def _validate_ranges(self) -> Self:
        """Cross-field checks (~Zod .refine()): ordering of the range bounds."""
        if self.date_from > self.date_to:
            raise ValueError("date_from must be on or before date_to")
        if self.qty_min is not None and self.qty_max is not None and self.qty_min > self.qty_max:
            raise ValueError("qty_min must be <= qty_max")
        return self
