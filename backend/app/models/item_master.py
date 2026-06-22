"""Read-only mapping of `item_master` — the product/style master, used for images.

Only ~326k rows (one per item), so a targeted `parent_style_no IN (...)` lookup is
~16 ms. Join key for the gallery: `olabi_sales.product_code = item_master."parentStyleNo"`
(98.5% of products have an image). DB columns are camelCase → quoted names below.

(We evaluated the matview `olabi_dim_store` first — it also has images but is 166M rows
and ~36× slower, so `item_master` is the right source.)
"""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ItemMaster(Base):
    __tablename__ = "item_master"

    item_no: Mapped[str] = mapped_column("itemNo", String, primary_key=True)
    parent_style_no: Mapped[str | None] = mapped_column("parentStyleNo", String)
    image_url: Mapped[str | None] = mapped_column("imageUrl", String)
