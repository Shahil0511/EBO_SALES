"""Global exception handlers → one consistent error envelope for the whole API.

Envelope (camelCase, matching the rest of the API):
    { "code": "...", "message": "...", "requestId": "...", "details": [...]? }

Registered in main.create_app(). Result: routes/services never format errors; a domain
exception, a validation failure, and an unexpected crash all return the same shape.
"""

import logging

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.context import request_id_ctx
from app.core.exceptions import AppError

logger = logging.getLogger("app.error")


def _envelope(status: int, code: str, message: str, **extra: object) -> JSONResponse:
    body: dict[str, object] = {"code": code, "message": message, "requestId": request_id_ctx.get()}
    body.update(extra)
    return JSONResponse(status_code=status, content=body)


async def app_error_handler(request: Request, exc: Exception) -> Response:
    """Map a domain `AppError` to its status + code. 5xx are logged with a traceback."""
    assert isinstance(exc, AppError)  # registered only for AppError
    if exc.status_code >= 500:
        logger.error("app_error: %s", exc.message, exc_info=exc)
    return _envelope(exc.status_code, exc.code, exc.message)


async def validation_error_handler(request: Request, exc: Exception) -> Response:
    """Reshape FastAPI's 422 into our envelope, with compact field-level details."""
    assert isinstance(exc, RequestValidationError)
    details = [
        {"field": ".".join(str(p) for p in err.get("loc", [])), "message": err.get("msg", "")}
        for err in exc.errors()
    ]
    message = details[0]["message"] if details else "Validation error"
    return _envelope(422, "validation_error", message, details=details)


async def unhandled_error_handler(request: Request, exc: Exception) -> Response:
    """Last resort: log the traceback, return a sanitized 500 (never leak internals)."""
    logger.error("unhandled error", exc_info=exc)
    return _envelope(500, "internal_error", "An unexpected error occurred.")


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)
