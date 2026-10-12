"""
Application-level error type and the consistent error envelope every API
route returns on failure:

    {"success": false, "error": {"code": "...", "message": "..."}, "request_id": "..."}
"""
from typing import Any, Optional


class AppError(Exception):
    """
    Raised by service-layer code for any expected failure (not-found,
    forbidden, conflict, validation). The FastAPI exception handler in
    app/main.py converts this into the standard error envelope with the
    right HTTP status code.
    """

    def __init__(self, message: str, *, code: str = "APP_ERROR", status_code: int = 400, details: Optional[Any] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found", *, code: str = "NOT_FOUND"):
        super().__init__(message, code=code, status_code=404)


class ForbiddenError(AppError):
    def __init__(self, message: str = "You do not have permission to do this.", *, code: str = "FORBIDDEN"):
        super().__init__(message, code=code, status_code=403)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Authentication required.", *, code: str = "UNAUTHORIZED"):
        super().__init__(message, code=code, status_code=401)


class ConflictError(AppError):
    def __init__(self, message: str, *, code: str = "CONFLICT"):
        super().__init__(message, code=code, status_code=409)
