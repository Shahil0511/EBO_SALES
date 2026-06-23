"""Schemas for filter option lists + the cascading staff filter
(GET /api/v1/filters/options, GET /api/v1/filters/salespeople)."""

from app.schemas.common import APIModel


class StoreOptionOut(APIModel):
    code: str
    name: str | None


class FilterOptionsResponse(APIModel):
    """Selectable values for each multi-select dimension, scoped to the date window."""

    stores: list[StoreOptionOut]
    brands: list[str]
    categories: list[str]
    channels: list[str]


class SalespersonOption(APIModel):
    code: str
    name: str | None
    count: int  # line items in scope (drives the cascade ordering)


class SalespersonsResponse(APIModel):
    salespersons: list[SalespersonOption]
