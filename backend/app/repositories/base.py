"""Base repository — holds the request-scoped AsyncSession.

Every repository subclasses this and receives its session by constructor injection
(wired by a provider in app/api/deps.py in M9). Holding the session here means
repositories never reach for a global connection — they use exactly the current
request's session, which is what makes them trivially testable (pass a test session).
"""

from sqlalchemy.ext.asyncio import AsyncSession


class BaseRepository:
    """Common base: stores the injected session as `self.session`."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
