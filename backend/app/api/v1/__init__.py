"""API v1 — the first versioned contract.

Everything the frontend depends on is mounted under `/api/v1`. When we ever need a
breaking change, it goes in a sibling `v2/` package and old clients keep using v1.
That stability guarantee is why we version from day one.
"""
