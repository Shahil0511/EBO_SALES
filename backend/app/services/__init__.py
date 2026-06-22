"""Service layer — business logic and orchestration.

Services own the domain rules (KPI math, period-over-period deltas, ranking, cascade)
and compose repositories into response DTOs. They never build SQL and never touch
HTTP — routers call them, they call repositories.
"""
