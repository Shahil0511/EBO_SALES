"""Declarative base for read-only ORM models mapped to EXISTING warehouse tables.

IMPORTANT: we do NOT own this schema. We never call `Base.metadata.create_all()`,
and there is no Alembic. These classes are a *typed read model* over tables that
already live in Unicorn — they exist so queries use Ctrl-clickable, type-checked
columns (e.g. `OlabiSales.nett_invoice_value`) instead of raw SQL strings.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared declarative base. Its metadata is never emitted to the database."""
