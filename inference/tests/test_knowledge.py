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
        _write_doc(self.tmpdir, "dialogue", "dialogue-only-skill", "dialogue only")
        _write_doc(self.tmpdir, "dialogue", "shared-skill", "DIALOGUE version (should lose)")
        # Cross-pool-only collision: present in common AND dialogue, absent from any mode.
        # Used to lock in the common > dialogue precedence within CROSS_MODALITY_MODES.
        _write_doc(self.tmpdir, "common", "cross-shared-skill", "COMMON version (should win)")
        _write_doc(self.tmpdir, "dialogue", "cross-shared-skill", "DIALOGUE version (should lose)")
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
        self.assertIn(
            "dialogue-only-skill",
            names,
            "dialogue pool entries must be merged into therapy-mode indexes",
        )
        # No leakage from unrelated modes
        self.assertNotIn("initial-only", names)

    def test_initial_index_does_not_merge_common(self) -> None:
        """INITIAL is a triage mode and must NOT pull in cross-modality docs."""
        index = knowledge.get_index("INITIAL")
        names = {e["_name"] for e in index}

        self.assertIn("initial-only", names)
        self.assertNotIn(
            "common-only-skill",
            names,
            "INITIAL mode must not merge common entries",
        )
        self.assertNotIn(
            "dialogue-only-skill",
            names,
            "INITIAL mode must not merge dialogue entries",
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

        self.assertEqual(names, {"common-only-skill", "shared-skill", "cross-shared-skill"})

    def test_dialogue_mode_returns_only_dialogue_entries(self) -> None:
        """get_index('dialogue') returns only the dialogue pool — no merge with common."""
        index = knowledge.get_index("dialogue")
        names = {e["_name"] for e in index}

        self.assertEqual(names, {"dialogue-only-skill", "shared-skill", "cross-shared-skill"})

    def test_dbt_shared_skill_prefers_mode_over_common_over_dialogue(self) -> None:
        """Dedup priority: mode-specific > common > dialogue (declared order)."""
        index = knowledge.get_index("DBT")
        shared = [e for e in index if e["_name"] == "shared-skill"]
        self.assertEqual(len(shared), 1)
        # mode-specific wins over both cross-modality pools
        self.assertEqual(shared[0]["description"], "DBT version (mode-specific)")

    def test_cross_modality_dedup_prefers_common_over_dialogue(self) -> None:
        """Within CROSS_MODALITY_MODES, earlier pool wins: common > dialogue.

        Locks in the precedence so re-ordering CROSS_MODALITY_MODES is caught
        even when the colliding skill name is absent from the mode-specific pool.
        """
        index = knowledge.get_index("DBT")
        cross_shared = [e for e in index if e["_name"] == "cross-shared-skill"]
        self.assertEqual(len(cross_shared), 1, "duplicate must be deduplicated")
        self.assertEqual(
            cross_shared[0]["description"],
            "COMMON version (should win)",
            "common pool must shadow dialogue pool when both define the same name",
        )


class FrontmatterSchemaTests(unittest.TestCase):
    """Lock the on-disk frontmatter schema that knowledge.py's selector reads.

    `_build_skill_index_text()` only consumes three fields from each entry's
    frontmatter — `description`, `when_to_use`, `token_estimate`. If a doc
    ships with an alternate field name (e.g. `summary` instead of
    `description`) the selector still loads it but sees an empty string, which
    silently degrades retrieval quality. This test scans every shipped pool
    and catches that drift.
    """

    REQUIRED_FIELDS = ("description", "when_to_use", "token_estimate")

    def test_all_shipped_docs_have_selector_required_fields(self) -> None:
        # Use the real on-disk corpus (NOT the synthetic tmpdir from the
        # other test class), so we catch real-world frontmatter drift.
        sums_dir = knowledge.DOCS_SUMS_DIR
        if not os.path.isdir(sums_dir):
            self.skipTest(f"docs/sums/ not found at {sums_dir}")

        # Force a clean reload — other tests in this file mutate the cache.
        knowledge._index_cache.clear()

        missing: list[str] = []
        for pool in sorted(os.listdir(sums_dir)):
            pool_dir = os.path.join(sums_dir, pool)
            if not os.path.isdir(pool_dir):
                continue
            for entry in knowledge._load_index(pool):
                for field in self.REQUIRED_FIELDS:
                    val = entry.get(field)
                    if val is None or val == "":
                        missing.append(
                            f"{pool}/{os.path.basename(entry['_path'])}: "
                            f"missing/empty `{field}`"
                        )

        knowledge._index_cache.clear()

        self.assertEqual(
            missing,
            [],
            "Selector schema drift — some shipped docs are missing required\n"
            "frontmatter fields used by _build_skill_index_text():\n  - "
            + "\n  - ".join(missing),
        )


if __name__ == "__main__":
    # Allow `python tests/test_knowledge.py` without requiring pytest.
    unittest.main(verbosity=2)
