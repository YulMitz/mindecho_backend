"""
Unit tests for inference/src/knowledge.py — focused on get_index() merging
behavior (mode-specific + common pool, INITIAL exclusion, and dedup rules).

Designed to run with either pytest OR as a plain script:

    # pytest (preferred — picks up `test_*` functions)
    cd inference && pytest tests/test_knowledge.py -v

    # plain python (no pytest needed; uses a tiny built-in runner at __main__)
    cd inference && python tests/test_knowledge.py

The tests build a temporary corpus directory and monkey-patch
src.knowledge.DOCS_SUMS_DIR so they never touch the real docs/sums/ tree.
"""

from __future__ import annotations

import os
import sys
import textwrap
import tempfile
import shutil
import unittest

# Make `src` importable when running directly as a script.
_HERE = os.path.dirname(os.path.abspath(__file__))
_INFERENCE_ROOT = os.path.dirname(_HERE)
if _INFERENCE_ROOT not in sys.path:
    sys.path.insert(0, _INFERENCE_ROOT)

from src import knowledge  # noqa: E402


def _write_doc(corpus_dir: str, mode: str, name: str, description: str = "desc") -> None:
    """Write a single frontmatter .md file under {corpus_dir}/{mode}/{name}.md."""
    mode_dir = os.path.join(corpus_dir, mode)
    os.makedirs(mode_dir, exist_ok=True)
    path = os.path.join(mode_dir, f"{name}.md")
    body = textwrap.dedent(
        f"""\
        ---
        name: {name}
        description: {description}
        when_to_use: when relevant
        token_estimate: 100
        ---
        Body for {name}.
        """
    )
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(body)


class GetIndexMergingTests(unittest.TestCase):
    """Behavior contract for knowledge.get_index() across therapy modes."""

    def setUp(self) -> None:
        self.tmpdir = tempfile.mkdtemp(prefix="knowledge_test_")
        # Build a small synthetic corpus:
        #   dbt/      → dbt-only-skill, shared-skill (overrides common's)
        #   common/   → common-only-skill, shared-skill
        #   initial/  → initial-only
        _write_doc(self.tmpdir, "dbt", "dbt-only-skill", "DBT specific")
        _write_doc(self.tmpdir, "dbt", "shared-skill", "DBT version (mode-specific)")
        _write_doc(self.tmpdir, "common", "common-only-skill", "common only")
        _write_doc(self.tmpdir, "common", "shared-skill", "COMMON version (should lose)")
        _write_doc(self.tmpdir, "initial", "initial-only", "initial triage")

        # Redirect knowledge.py at our synthetic corpus and clear its cache.
        self._orig_dir = knowledge.DOCS_SUMS_DIR
        knowledge.DOCS_SUMS_DIR = self.tmpdir
        knowledge._index_cache.clear()

    def tearDown(self) -> None:
        knowledge.DOCS_SUMS_DIR = self._orig_dir
        knowledge._index_cache.clear()
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    # ── Tests ────────────────────────────────────────────────────────────────

    def test_dbt_index_includes_dbt_and_common_entries(self) -> None:
        """get_index('DBT') merges DBT-specific entries with the common pool."""
        index = knowledge.get_index("DBT")
        names = {e["_name"] for e in index}

        self.assertIn("dbt-only-skill", names, "DBT-specific entry must be present")
        self.assertIn(
            "common-only-skill",
            names,
            "common pool entries must be merged into therapy-mode indexes",
        )
        # No leakage from unrelated modes
        self.assertNotIn("initial-only", names)

    def test_initial_index_does_not_merge_common(self) -> None:
        """INITIAL is a triage mode and must NOT pull in cross-modality common docs."""
        index = knowledge.get_index("INITIAL")
        names = {e["_name"] for e in index}

        self.assertIn("initial-only", names)
        self.assertNotIn(
            "common-only-skill",
            names,
            "INITIAL mode must not merge common entries",
        )
        self.assertNotIn("dbt-only-skill", names)

    def test_duplicate_name_prefers_mode_specific_entry(self) -> None:
        """When a name exists in both the mode pool and common, the mode wins."""
        index = knowledge.get_index("DBT")
        shared = [e for e in index if e["_name"] == "shared-skill"]

        self.assertEqual(
            len(shared),
            1,
            "duplicate-named entries must be deduplicated, not appear twice",
        )
        self.assertEqual(
            shared[0]["description"],
            "DBT version (mode-specific)",
            "mode-specific entry must shadow the common-pool entry of the same name",
        )

    def test_common_mode_returns_only_common_entries(self) -> None:
        """Sanity: get_index('common') returns only the common pool, no recursion."""
        index = knowledge.get_index("common")
        names = {e["_name"] for e in index}

        self.assertEqual(names, {"common-only-skill", "shared-skill"})


if __name__ == "__main__":
    # Allow `python tests/test_knowledge.py` without requiring pytest.
    unittest.main(verbosity=2)
