"""Shared schema foundation.

`APIModel` is the base for every request/response model. It makes the API speak
**camelCase JSON** (idiomatic for the TypeScript/Next.js client) while our Python code
keeps snake_case field names — Pydantic translates between them.
"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class APIModel(BaseModel):
    """Base model for the whole API surface.

    - `alias_generator=to_camel`  → JSON keys are camelCase (`net_revenue` → `netRevenue`).
    - `populate_by_name=True`     → models can still be built with snake_case field names
                                    (so our Python code reads naturally).
    - `from_attributes=True`      → a response can be built directly from an ORM row or a
                                    repository dataclass via `Model.model_validate(obj)`.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )
