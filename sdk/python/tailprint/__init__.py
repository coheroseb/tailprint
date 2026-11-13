"""Official Tailprint Python Client SDK."""

from .client import Tailprint
from .errors import (
    AuthenticationError,
    RateLimitError,
    TailprintError,
    TimeoutError,
    ValidationError,
)

__version__ = "1.4.0"
__all__ = [
    "Tailprint",
    "TailprintError",
    "AuthenticationError",
    "RateLimitError",
    "ValidationError",
    "TimeoutError",
    "__version__",
]
