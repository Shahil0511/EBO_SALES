"""Domain exceptions.

Services raise these — they carry an HTTP status + a stable machine code but know
NOTHING about FastAPI/HTTP themselves. The handlers (core/exception_handlers.py)
translate them into the consistent error envelope. This keeps `try/except HTTPException`
out of services and routes.
"""


class AppError(Exception):
    """Base for all expected, mapped application errors."""

    status_code: int = 500
    code: str = "internal_error"

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class InvalidRequestError(AppError):
    status_code = 400
    code = "invalid_request"


class ServiceUnavailableError(AppError):
    status_code = 503
    code = "service_unavailable"
