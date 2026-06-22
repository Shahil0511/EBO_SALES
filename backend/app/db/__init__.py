"""Database access — the async engine, the session factory, and the get_db dependency.

This is the innermost ring on the data side. Repositories (built later) import the
session from here; nothing here imports services or routers.
"""
