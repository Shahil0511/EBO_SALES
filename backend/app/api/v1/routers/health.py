


from fastapi import APIRouter

# A router is a mountable group of routes (~express.Router()). `tags` groups these
# endpoints together in the /docs UI. No prefix here — the version prefix (/api/v1)
# is applied once, centrally, in app.api.v1.router (DRY: one place owns the prefix).
router = APIRouter(tags=["system"])


@router.get("/health")
def health() -> dict[str, str]:
    """Liveness probe — 200 while the process is up.

    Still a plain `def` (no IO yet). In M10 this becomes `async def` and pings the
    Unicorn warehouse, so a 200 will mean "up AND able to reach the database".
    """
    return {"status": "ok"}
