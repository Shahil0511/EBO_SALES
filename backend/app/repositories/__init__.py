"""Repository layer — the ONLY place SQL is written.

Repositories own all SQLAlchemy `select()` construction, filtering, grouping and
aggregation. Services call repositories; repositories never know about HTTP, and
nothing here imports services or routers.
"""
