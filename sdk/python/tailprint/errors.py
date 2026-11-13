"""Tailprint SDK exception classes."""

from typing import Any, Optional


class TailprintError(Exception):
    """Base exception for all Tailprint SDK errors."""

    def __init__(self, message: str, status_code: int = 500, details: Optional[Any] = None) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(message={self.message!r}, status_code={self.status_code})"


class AuthenticationError(TailprintError):
    """Raised when an API key is missing, invalid, or inactive (HTTP 401)."""
    pass


class RateLimitError(TailprintError):
    """Raised when the monthly quota is exhausted (HTTP 429)."""
    pass


class ValidationError(TailprintError):
    """Raised when request parameters fail schema validation (HTTP 400)."""
    pass


class TimeoutError(TailprintError):
    """Raised when a job or HTTP request exceeds its timeout (HTTP 408 / 504)."""
    pass
