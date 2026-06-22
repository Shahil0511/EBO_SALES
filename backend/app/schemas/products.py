"""Schemas for the product gallery + drill-down (GET /api/v1/products[/{code}])."""

from typing import Literal

from pydantic import Field

from app.schemas.common import APIModel
from app.schemas.filters import AnalyticsFilters


class ProductQuery(AnalyticsFilters):
    """Filters + ranking + pagination, as one query-parameter model."""

    rank_by: Literal["revenue", "units", "returns"] = "revenue"
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=24, ge=1, le=100)


class ProductCard(APIModel):
    """One product tile in the gallery."""

    product_code: str
    category: str
    image_url: str | None
    variant_count: int
    net_revenue: float
    units: int
    returns_units: int


class VariantItem(APIModel):
    """One size/variant of a product (drill-down)."""

    sku: str
    net_revenue: float
    units: int


class ProductDetail(APIModel):
    """A single product with its variants, for the drill-down view."""

    product_code: str
    image_url: str | None
    variant_count: int
    net_revenue: float
    units: int
    variants: list[VariantItem]
