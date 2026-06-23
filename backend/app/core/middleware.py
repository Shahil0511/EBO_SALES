"""HTTP middleware: assign a request id, time the request, emit one access log.

The request id comes from an inbound `X-Request-ID` (if a gateway/Data Nexus set one)
or is generated. It is put on the context var (so logs + error envelopes pick it up)
and echoed back in the response header for end-to-end correlation.
"""

import logging
import time
from collections.abc import Awaitable, Callable
from uuid import uuid4

from starlette.requests import Request
from starlette.responses import Response

from app.core.context import request_id_ctx

logger = logging.getLogger("app.access")


async def request_context_middleware(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    request_id = request.headers.get("X-Request-ID") or uuid4().hex
    token = request_id_ctx.set(request_id)
    start = time.perf_counter()
    try:
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "http_request",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response
    finally:
        request_id_ctx.reset(token)
