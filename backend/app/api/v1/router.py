"""The single versioned router that aggregates every v1 route module.

`main.create_app()` includes just this one router; each new resource registers
itself here with one `include_router(...)` line. This file is the table of
contents for the whole v1 API.

Navigability: Ctrl-click `health` below to jump to its route module; Ctrl-click
`api_router` from `main.py` to land here.
"""

from fastapi import APIRouter

from app.api.v1.routers import (
    analytics,
    breakdowns,
    export,
    filters,
    health,
    products,
    search,
    stores,
    transactions,
)

# The version prefix is set in exactly ONE place. Every included router inherits it,
# so the health route becomes GET /api/v1/health and summary GET /api/v1/analytics/summary.
api_router = APIRouter(prefix="/api/v1")

# Register each resource's router. More lines join here as milestones add endpoints
# (products, transactions, search, filters, export).
api_router.include_router(health.router)
api_router.include_router(analytics.router)
api_router.include_router(breakdowns.router)
api_router.include_router(products.router)
api_router.include_router(transactions.router)
api_router.include_router(search.router)
api_router.include_router(filters.router)
api_router.include_router(export.router)
api_router.include_router(stores.router)
