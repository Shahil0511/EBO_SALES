# syntax=docker/dockerfile:1
# Multi-stage build: a fat builder installs deps into a venv; a slim runtime copies
# only that venv. Same pattern as a Node multi-stage build (build deps → slim runtime).

# ---------- builder: install the app + deps into an isolated venv ----------
FROM python:3.12-slim AS builder
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /build
COPY pyproject.toml ./
COPY app ./app
# Installs runtime deps from pyproject AND the `app` package into the venv site-packages.
RUN pip install --upgrade pip && pip install .

# ---------- runtime: minimal, non-root ----------
FROM python:3.12-slim AS runtime
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Copy only the built virtualenv — no build tools, no source tree, no caches.
COPY --from=builder /opt/venv /opt/venv

# Run as an unprivileged user (never root in a container).
RUN useradd --uid 10001 --create-home appuser
USER appuser
WORKDIR /home/appuser

EXPOSE 8000

# Readiness probe: 200 from /api/v1/health means the API is up AND can reach Unicorn.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health').getcode()==200 else 1)"

# Multiple uvicorn workers for production concurrency. Config comes from env (compose).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
