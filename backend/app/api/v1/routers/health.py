"""Health / readiness routes.

Upgraded in M10 from a bare liveness check to a **readiness** probe: it runs a trivial
`SELECT 1` so a 200 means "the API is up AND can reach the Unicorn warehouse". The DB
session is injected the same way every data endpoint gets one — via `Depends(get_db)`.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

router = APIRouter(tags=["system"])


@router.get("/health")
async def health(db: Annotated[AsyncSession, Depends(get_db)]) -> dict[str, str]:
    """Readiness probe — 200 only if a round-trip to Postgres succeeds.

    (If the DB is unreachable this raises and currently surfaces as 500; M15's
    centralized error handling will turn that into a clean 503.)
    """
    await db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "reachable"}
