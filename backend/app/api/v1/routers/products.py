"""Product routes — the ranked gallery and a single-product drill-down.

GET /api/v1/products              → Page[ProductCard], ranked + paginated
GET /api/v1/products/{code}       → ProductDetail with its variants
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_analytics_service
from app.schemas.common import Page
from app.schemas.filters import AnalyticsFilters
from app.schemas.products import ProductCard, ProductDetail, ProductQuery
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=Page[ProductCard])
async def list_products(
    query: Annotated[ProductQuery, Query()],
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> Page[ProductCard]:
    """Products ranked by revenue|units|returns, with image + variant count, paginated."""
    return await service.get_products(query)


@router.get("/{product_code}", response_model=ProductDetail)
async def get_product(
    product_code: str,
    filters: Annotated[AnalyticsFilters, Query()],
    service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> ProductDetail:
    """A single product and its per-variant sales over the filtered window."""
    return await service.get_product_detail(filters, product_code)
