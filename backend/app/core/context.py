"""Request-scoped context shared across logging, middleware, and error handlers.

A `ContextVar` is the async-safe equivalent of thread-local storage (≈ Node's
AsyncLocalStorage): each request gets its own value even though many run concurrently
on one event loop. We use it to carry the request id into logs and error responses
without threading it through every function call.
"""

from contextvars import ContextVar

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")
