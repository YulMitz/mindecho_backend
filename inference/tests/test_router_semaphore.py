"""
Unit tests for inference/src/router.py — focused on the Phase 2.2
concurrency semaphore configuration and runtime behavior.

These tests do NOT require a running FastAPI app or any LLM SDKs; they
exercise the env-parsing helper directly and verify the semaphore's
acquire/release lifecycle (including correct release on exception).
"""

from __future__ import annotations

import asyncio
import os
import sys
import types
import unittest
from unittest import mock

_HERE = os.path.dirname(os.path.abspath(__file__))
_INFERENCE_ROOT = os.path.dirname(_HERE)
if _INFERENCE_ROOT not in sys.path:
    sys.path.insert(0, _INFERENCE_ROOT)

# Stub provider SDKs so this test runs without google-genai / anthropic
# installed. router imports `from . import providers`, which imports both.
def _install_stub(modname: str, attrs: dict | None = None) -> None:
    mod = types.ModuleType(modname)
    for k, v in (attrs or {}).items():
        setattr(mod, k, v)
    sys.modules[modname] = mod

if "google" not in sys.modules:
    _install_stub("google")
if "google.genai" not in sys.modules:
    genai_stub = types.ModuleType("google.genai")
    genai_stub.types = types.SimpleNamespace(
        Content=lambda **kw: kw,
        Part=lambda **kw: kw,
        GenerateContentConfig=lambda **kw: kw,
    )
    genai_stub.Client = lambda **kw: types.SimpleNamespace(
        aio=types.SimpleNamespace(
            chats=types.SimpleNamespace(create=lambda **k: None),
            models=types.SimpleNamespace(generate_content=lambda **k: None),
        )
    )
    sys.modules["google.genai"] = genai_stub
    sys.modules["google"].genai = genai_stub  # type: ignore[attr-defined]
if "anthropic" not in sys.modules:
    anthropic_stub = types.ModuleType("anthropic")
    anthropic_stub.AsyncAnthropic = lambda **kw: types.SimpleNamespace(
        messages=types.SimpleNamespace(create=lambda **k: None)
    )
    sys.modules["anthropic"] = anthropic_stub
if "frontmatter" not in sys.modules:
    fm = types.ModuleType("frontmatter")
    fm.load = lambda path: types.SimpleNamespace(metadata={}, content="")
    sys.modules["frontmatter"] = fm

from src import router  # noqa: E402


class ResolveMaxConcurrentTests(unittest.TestCase):
    """The env-parsing helper must never produce a deadlocking value."""

    def _resolve(self, value):
        env = {} if value is None else {"MAX_CONCURRENT_LLM_CALLS": value}
        with mock.patch.dict(os.environ, env, clear=False):
            if value is None:
                os.environ.pop("MAX_CONCURRENT_LLM_CALLS", None)
            return router._resolve_max_concurrent_llm_calls()

    def test_default_when_unset(self):
        self.assertEqual(self._resolve(None), router._DEFAULT_MAX_CONCURRENT_LLM_CALLS)

    def test_default_when_empty_string(self):
        self.assertEqual(self._resolve(""), router._DEFAULT_MAX_CONCURRENT_LLM_CALLS)

    def test_valid_positive_int(self):
        self.assertEqual(self._resolve("42"), 42)

    def test_non_integer_falls_back(self):
        self.assertEqual(self._resolve("foo"), router._DEFAULT_MAX_CONCURRENT_LLM_CALLS)

    def test_zero_falls_back_to_avoid_deadlock(self):
        # A literal Semaphore(0) would silently hang every request forever.
        self.assertEqual(self._resolve("0"), router._DEFAULT_MAX_CONCURRENT_LLM_CALLS)

    def test_negative_falls_back(self):
        self.assertEqual(self._resolve("-1"), router._DEFAULT_MAX_CONCURRENT_LLM_CALLS)

    def test_float_string_falls_back(self):
        self.assertEqual(self._resolve("2.5"), router._DEFAULT_MAX_CONCURRENT_LLM_CALLS)


class SemaphoreReleaseTests(unittest.TestCase):
    """The semaphore must release the permit even when the body raises."""

    def test_permit_released_on_exception(self):
        async def scenario():
            sem = asyncio.Semaphore(1)

            async def body_raises():
                async with sem:
                    raise RuntimeError("boom")

            with self.assertRaises(RuntimeError):
                await body_raises()

            # If the permit leaked we would deadlock on this acquire under
            # wait_for; the timeout proves release happened.
            await asyncio.wait_for(sem.acquire(), timeout=0.5)
            sem.release()

        asyncio.run(scenario())

    def test_concurrent_requests_are_capped(self):
        """With Semaphore(2), only 2 of 5 coroutines run inside the body at once."""
        async def scenario():
            sem = asyncio.Semaphore(2)
            inside = 0
            peak = 0
            lock = asyncio.Lock()

            async def worker():
                nonlocal inside, peak
                async with sem:
                    async with lock:
                        inside += 1
                        peak = max(peak, inside)
                    await asyncio.sleep(0.02)
                    async with lock:
                        inside -= 1

            await asyncio.gather(*(worker() for _ in range(5)))
            return peak

        peak = asyncio.run(scenario())
        self.assertLessEqual(peak, 2, f"semaphore allowed {peak} concurrent (>2)")


if __name__ == "__main__":
    unittest.main(verbosity=2)
