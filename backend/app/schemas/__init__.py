"""Schemas — the Pydantic v2 wire contract (request + response models).

This is the API shape, deliberately separate from `app/models` (DB shape) and from
the repositories' domain dataclasses. Routes validate inputs and serialize outputs
through these; nothing here touches SQL.
"""

from app.schemas.analytics import KpiDelta, SummaryResponse
from app.schemas.common import APIModel
from app.schemas.filters import AnalyticsFilters
from app.schemas.trends import TrendPointOut, TrendResponse

__all__ = [
    "APIModel",
    "AnalyticsFilters",
    "KpiDelta",
    "SummaryResponse",
    "TrendPointOut",
    "TrendResponse",
]
