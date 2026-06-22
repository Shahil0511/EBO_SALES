"""Read-only mapping of `ebo_store_master` — the EBO store dimension (53 rows).

Joined to `olabi_sales` on `store_code = invoice_associate_code` (LEFT JOIN; 53 of 57
store codes match — the 4 unmatched are warehouse/online pseudo-stores). Mapped here
are the columns the store / region / city / cluster breakdowns need.

`store_code` is the real key of this table, so it is a genuine primary key (unlike
the mapping-only PK on the fact table).
"""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class EboStoreMaster(Base):
    __tablename__ = "ebo_store_master"

    store_code: Mapped[str] = mapped_column(String, primary_key=True)
    store_name: Mapped[str | None] = mapped_column(String)
    region: Mapped[str | None] = mapped_column(String)
    state: Mapped[str | None] = mapped_column(String)
    city: Mapped[str | None] = mapped_column(String)
    cluster: Mapped[str | None] = mapped_column(String)
    store_type: Mapped[str | None] = mapped_column(String)
