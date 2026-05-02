"""
Unit tests for inference/src/retry_utils.py — verifies the transient-vs-permanent
classifier and that call_with_retry reissues the coroutine on transient failures.
"""

from __future__ import annotations

import asyncio
import os
import sys
import unittest

_HERE = os.path.dirname(os.path.abspath(__file__))
_INFERENCE_ROOT = os.path.dirname(_HERE)
if _INFERENCE_ROOT not in sys.path:
    sys.path.insert(0, _INFERENCE_ROOT)

from src import retry_utils  # noqa: E402


class _FakeStatusError(Exception):
    def __init__(self, status_code: int):
        super().__init__(f"status {status_code}")
        self.status_code = status_code


class _FakeConnectionError(Exception):
    """Class name contains 'Connection' so the heuristic flags it transient."""


class _FakePermanentError(Exception):
    """Generic exception with no status — must NOT retry."""


class IsTransientTests(unittest.TestCase):
    def test_429_is_transient(self):
        self.assertTrue(retry_utils._is_transient(_FakeStatusError(429)))

    def test_503_is_transient(self):
        self.assertTrue(retry_utils._is_transient(_FakeStatusError(503)))

    def test_400_is_not_transient(self):
        self.assertFalse(retry_utils._is_transient(_FakeStatusError(400)))

    def test_401_is_not_transient(self):
        self.assertFalse(retry_utils._is_transient(_FakeStatusError(401)))

    def test_connection_error_class_name_is_transient(self):
        self.assertTrue(retry_utils._is_transient(_FakeConnectionError("boom")))

    def test_unknown_exception_is_not_retried(self):
        self.assertFalse(retry_utils._is_transient(_FakePermanentError("boom")))


class CallWithRetryTests(unittest.TestCase):
    def test_retries_then_succeeds_on_transient(self):
        attempts = {"n": 0}

        async def factory():
            attempts["n"] += 1
            if attempts["n"] < 3:
                raise _FakeStatusError(503)
            return "ok"

        result = asyncio.run(
            retry_utils.call_with_retry(factory, attempts=5, wait_initial=0.0, wait_max=0.0)
        )
        self.assertEqual(result, "ok")
        self.assertEqual(attempts["n"], 3)

    def test_does_not_retry_permanent(self):
        attempts = {"n": 0}

        async def factory():
            attempts["n"] += 1
            raise _FakeStatusError(400)

        with self.assertRaises(_FakeStatusError):
            asyncio.run(
                retry_utils.call_with_retry(
                    factory, attempts=5, wait_initial=0.0, wait_max=0.0
                )
            )
        self.assertEqual(attempts["n"], 1)

    def test_gives_up_after_attempts(self):
        attempts = {"n": 0}

        async def factory():
            attempts["n"] += 1
            raise _FakeStatusError(429)

        with self.assertRaises(_FakeStatusError):
            asyncio.run(
                retry_utils.call_with_retry(
                    factory, attempts=2, wait_initial=0.0, wait_max=0.0
                )
            )
        self.assertEqual(attempts["n"], 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
