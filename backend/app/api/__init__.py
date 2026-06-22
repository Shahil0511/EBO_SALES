"""API layer — HTTP routing only.

This layer's single job is the web boundary: receive a request, validate it,
delegate to a service, return a typed response. No business logic, no SQL ever
lives here. Versioned sub-packages (v1/, later v2/) live below.
"""
