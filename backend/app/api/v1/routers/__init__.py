"""Route modules — one file per resource (health, analytics, breakdowns, …).

Each module exposes a module-level `router = APIRouter(...)`. They are aggregated
into one versioned router by `app.api.v1.router`, which `main.create_app()` mounts.
"""
