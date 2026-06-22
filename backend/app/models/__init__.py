"""ORM read models over existing Unicorn tables.

Import models from this package (`from app.models import OlabiSales`) so they are
registered on `Base` exactly once and are discoverable in one place.
"""

from app.models.base import Base
from app.models.ebo_store_master import EboStoreMaster
from app.models.olabi_sales import OlabiSales

__all__ = ["Base", "EboStoreMaster", "OlabiSales"]
