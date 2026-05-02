"""
Shared retry policy for outbound LLM provider calls.

Phase 2.3 of .plan/scaling-plan-100-concurrent-users.md: under high concurrency
both Gemini and Anthropic surface transient 429s and 5xx. We retry those a
small number of times with exponential backoff, but never retry on 4xx that
indicate a permanent client problem (auth, malformed request).

The decision to retry is based on inspecting an exception's HTTP status code
where the provider SDKs expose one:

  - anthropic: APIStatusError.status_code
  - google.genai: errors.APIError.code

plus a generic catch for connection-level / timeout exceptions which are
always safe to retry.
"""

from __future__ import annotations

import logging
from typing import Any

from tenacity import (
    AsyncRetrying,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)

logger = logging.getLogger(__name__)

# HTTP statuses we treat as transient.
_TRANSIENT_STATUSES = {408, 425, 429, 500, 502, 503, 504}

# Default policy — small attempt count keeps worst-case latency bounded.
DEFAULT_ATTEMPTS = 3
DEFAULT_WAIT_INITIAL = 1.0
DEFAULT_WAIT_MAX = 8.0


def _extract_status(exc: BaseException) -> int | None:
    """Pull an HTTP status code out of provider SDK exceptions if available."""
    for attr in ("status_code", "code", "status"):
        val = getattr(exc, attr, None)
        if isinstance(val, int):
            return val
        # google.genai.errors.APIError exposes .code as int-ish
        if isinstance(val, str) and val.isdigit():
            return int(val)
    # google.genai sometimes nests status under .response
    response = getattr(exc, "response", None)
    if response is not None:
        sc = getattr(response, "status_code", None)
        if isinstance(sc, int):
            return sc
    return None


def _is_transient(exc: BaseException) -> bool:
    # Connection-level / timeout exceptions: always retry. We test by class
    # name to avoid hard-importing httpx / anthropic / google SDK error trees
    # in this shared helper.
    name = type(exc).__name__
    if any(
        token in name
        for token in ("Timeout", "Connection", "APIConnection", "Network")
    ):
        return True

    status = _extract_status(exc)
    if status is None:
        # Unknown error shape — do NOT retry. Surface it so we don't mask bugs.
        return False
    return status in _TRANSIENT_STATUSES


def llm_retry(
    attempts: int = DEFAULT_ATTEMPTS,
    wait_initial: float = DEFAULT_WAIT_INITIAL,
    wait_max: float = DEFAULT_WAIT_MAX,
) -> AsyncRetrying:
    """Build an AsyncRetrying configured for transient LLM API failures.

    Usage:
        async for attempt in llm_retry():
            with attempt:
                return await provider_call(...)
    """
    return AsyncRetrying(
        stop=stop_after_attempt(attempts),
        wait=wait_exponential(multiplier=wait_initial, max=wait_max),
        retry=retry_if_exception(_is_transient),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )


async def call_with_retry(coro_factory: Any, **kwargs: Any) -> Any:
    """Convenience wrapper: call `await coro_factory()` with the default policy.

    `coro_factory` must be a zero-arg callable returning a coroutine, so each
    retry attempt creates a fresh coroutine (coroutines can only be awaited
    once).
    """
    async for attempt in llm_retry(**kwargs):
        with attempt:
            return await coro_factory()
