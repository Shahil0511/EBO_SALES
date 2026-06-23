"""Schemas for global search (GET /api/v1/search)."""

from typing import Literal

from pydantic import Field

from app.schemas.common import APIModel
from app.schemas.filters import AnalyticsFilters


class SearchQuery(AnalyticsFilters):
    """Date window (for scoping) + the term + per-kind result cap."""

    q: str = Field(min_length=1, max_length=100)
    limit: int = Field(default=8, ge=1, le=50)  # max hits per kind


class SearchHitOut(APIModel):
    kind: Literal["product", "sku", "invoice"]
    value: str


class SearchResponse(APIModel):
    query: str
    hits: list[SearchHitOut]
