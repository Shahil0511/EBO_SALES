"""Core / cross-cutting machinery.

Code here is depended upon by every layer (config, logging, exceptions,
middleware, pagination). It must NOT import from api/, services/, or repositories/
— dependencies point inward, and `core` is the innermost ring.
"""
