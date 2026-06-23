"""Structured logging configuration.

Production: one JSON object per line (machine-parseable; Docker/Nginx collect stdout).
Local dev: a short human-readable line. Every record carries the request id from the
context var, and a PII filter masks phone numbers / emails so customer data never
lands in logs (the warehouse is full of `consumer_mobile` / `consumer_e_mail`).
"""

import json
import logging
import re
import sys
from typing import Any

from app.core.context import request_id_ctx

# Best-effort PII masking applied to every emitted string value.
_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_PHONE_RE = re.compile(r"\b\d{10,}\b")
# Fields we copy off the LogRecord into the JSON payload when present.
_EXTRA_FIELDS = ("method", "path", "status", "duration_ms")


def _mask(text: str) -> str:
    return _PHONE_RE.sub("***", _EMAIL_RE.sub("***", text))


class JsonFormatter(logging.Formatter):
    """Render a record as a single masked JSON line."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "request_id": request_id_ctx.get(),
            "message": record.getMessage(),
        }
        for field in _EXTRA_FIELDS:
            if hasattr(record, field):
                payload[field] = getattr(record, field)
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        masked = {k: (_mask(v) if isinstance(v, str) else v) for k, v in payload.items()}
        return json.dumps(masked, ensure_ascii=False)


class ConsoleFormatter(logging.Formatter):
    """Readable single line for local dev (still masked)."""

    def format(self, record: logging.LogRecord) -> str:
        rid = request_id_ctx.get()
        base = f"{record.levelname:7s} [{rid[:8]}] {record.name}: {record.getMessage()}"
        if record.exc_info:
            base += "\n" + self.formatException(record.exc_info)
        return _mask(base)


def configure_logging(level: str, json_logs: bool) -> None:
    """Install a single stdout handler on the `app` logger. Idempotent."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter() if json_logs else ConsoleFormatter())

    app_logger = logging.getLogger("app")
    app_logger.handlers.clear()
    app_logger.addHandler(handler)
    app_logger.setLevel(level.upper())
    app_logger.propagate = False  # don't double-log via the root logger
