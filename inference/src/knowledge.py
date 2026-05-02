"""
Knowledge selection module.

On startup, loads frontmatter from all .md files in docs/sums/{mode}/.
At request time, runs a two-step LLM call:
  Step 0: summarize recent conversation into themes
  Step 1: select relevant knowledge files based on themes + current message
Returns the concatenated body content of selected files (capped at TOKEN_CAP).
"""

import os
import re
import logging
import frontmatter

logger = logging.getLogger(__name__)

DOCS_SUMS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "sums")
COMMON_MODE = "common"
TOKEN_CAP = 2000
# Rough chars-per-token estimate for capping without a tokenizer dependency
CHARS_PER_TOKEN = 4

SELECTION_MODEL_GEMINI = "gemini-2.5-flash"
SELECTION_MODEL_ANTHROPIC = "claude-haiku-4-5-20251001"


# ── Index loading ──────────────────────────────────────────────────────────────

def _load_index(mode: str) -> list[dict]:
    """
    Load frontmatter from all .md files for a given mode.
    Returns a list of dicts with frontmatter fields + file path.
    """
    mode_dir = os.path.join(DOCS_SUMS_DIR, mode.lower())
    if not os.path.isdir(mode_dir):
        return []

    index = []
    for filename in sorted(os.listdir(mode_dir)):
        if not filename.endswith(".md") or filename.startswith("_"):
            continue
        path = os.path.join(mode_dir, filename)
        try:
            post = frontmatter.load(path)
            meta = dict(post.metadata)
            meta["_path"] = path
            meta["_body"] = post.content
            meta["_name"] = meta.get("name", filename[:-3])
            index.append(meta)
        except Exception as e:
            logger.warning(f"Failed to load {path}: {e}")

    return index


# Cache indexed per mode at module level — reloaded only on process start
_index_cache: dict[str, list[dict]] = {}


def get_index(mode: str) -> list[dict]:
    """
    Return the merged knowledge index for a therapy mode.

    For any therapy mode (CBT/MBT/MBCT/DBT), the returned index is the union of:
      1. The mode-specific entries from docs/sums/{mode}/
      2. The cross-modality "common" entries from docs/sums/common/

    The small selector LLM then picks across both pools naturally based on relevance.
    Duplicate entries (by name) prefer the mode-specific version.

    `mode == "common"` returns ONLY the common pool (no recursion).
    Unknown / INITIAL modes return mode-specific entries only.
    """
    cache_key = mode.lower()
    if cache_key in _index_cache:
        return _index_cache[cache_key]

    own = _load_index(mode)

    if cache_key == COMMON_MODE or cache_key == "initial":
        merged = own
    else:
        common_entries = _load_index(COMMON_MODE)
        own_names = {e.get("_name") for e in own}
        merged = own + [e for e in common_entries if e.get("_name") not in own_names]

    _index_cache[cache_key] = merged
    logger.info(
        f"Loaded {len(merged)} knowledge files for mode={mode} "
        f"({len(own)} mode-specific + {len(merged) - len(own)} from common)"
    )
    return merged


def _build_skill_index_text(index: list[dict]) -> str:
    """Render the index as a compact text block for the selection prompt."""
    lines = []
    for entry in index:
        name = entry.get("_name", "unknown")
        description = entry.get("description", "")
        when_to_use = entry.get("when_to_use", "")
        token_estimate = entry.get("token_estimate", "?")
        lines.append(
            f'- name: "{name}"\n'
            f'  description: {description}\n'
            f'  when_to_use: {when_to_use}\n'
            f'  token_estimate: {token_estimate}'
        )
    return "\n\n".join(lines)


# ── Prompts ────────────────────────────────────────────────────────────────────

def _get_summary_prompt() -> str:
    return """You are a conversation analyst for a mental health therapy chatbot.
Read the conversation history and produce a SHORT thematic summary (2-4 sentences max).

Focus on:
- The emotional themes the person is expressing
- The patterns or struggles they describe
- Any specific triggers, relationships, or situations mentioned

Do NOT include the person's exact words. Write in third-person.
If the conversation is very short or just a greeting, return: NONE"""


def _get_selection_prompt(chatbot_type: str, token_cap: int) -> str:
    return f"""You are a knowledge selector for a {chatbot_type} therapy chatbot.

Given the conversation summary and the user's latest message, select which knowledge files
(if any) should be injected as context to help the therapist respond.

Available knowledge files:
{{skill_index}}

Rules:
- Select 0 to 3 files. Select 0 if no knowledge is clearly relevant.
- Total token_estimate of selected files must not exceed {token_cap}.
- Prefer files with higher relevance over lower relevance when near the token cap.
- Return ONLY a JSON array of selected file names, e.g. ["cognitive-distortions", "thought-records"]
- Return [] if none are relevant.
- Do NOT explain your reasoning. Output only the JSON array."""


# ── LLM calls ─────────────────────────────────────────────────────────────────

async def _call_gemini_selection(system: str, user: str) -> str:
    from google import genai

    api_key = os.environ.get("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    response = await client.aio.models.generate_content(
        model=SELECTION_MODEL_GEMINI,
        contents=user,
        config=genai.types.GenerateContentConfig(
            system_instruction=system,
            temperature=0.0,
            max_output_tokens=256,
        ),
    )
    return response.text or ""


async def _call_anthropic_selection(system: str, user: str) -> str:
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    client = anthropic.AsyncAnthropic(api_key=api_key)
    response = await client.messages.create(
        model=SELECTION_MODEL_ANTHROPIC,
        max_tokens=256,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return response.content[0].text


async def _call_selection_llm(system: str, user: str, provider: str) -> str:
    if provider == "ANTHROPIC":
        return await _call_anthropic_selection(system, user)
    return await _call_gemini_selection(system, user)


# ── Main public function ───────────────────────────────────────────────────────

async def pick_knowledge(
    chatbot_type: str,
    conversation_history: list[dict],
    message: str,
    provider: str = "GEMINI",
) -> str:
    """
    Run Step 0 (conversation summary) + Step 1 (file selection).
    Returns the concatenated body of selected .md files, or "" if none selected.
    """
    index = get_index(chatbot_type)
    if not index:
        return ""

    # Step 0: summarize recent conversation into themes
    conversation_summary = "NONE"
    if len(conversation_history) >= 2:
        recent = conversation_history[-6:]  # last 3 rounds
        history_text = "\n".join(
            f"{'User' if m['role'] == 'user' else 'Therapist'}: {m['content']}"
            for m in recent
        )
        try:
            conversation_summary = await _call_selection_llm(
                _get_summary_prompt(),
                f"Conversation history:\n{history_text}",
                provider,
            )
            conversation_summary = conversation_summary.strip() or "NONE"
        except Exception as e:
            logger.warning(f"Conversation summary failed: {e}")

    # Step 1: select knowledge files
    skill_index_text = _build_skill_index_text(index)
    selection_system = _get_selection_prompt(chatbot_type, TOKEN_CAP).format(
        skill_index=skill_index_text
    )
    selection_user = (
        f"Conversation summary: {conversation_summary}\n\n"
        f"User's latest message: {message}"
    )

    selected_names: list[str] = []
    try:
        raw = await _call_selection_llm(selection_system, selection_user, provider)
        # Extract JSON array from response (model may wrap it in markdown)
        match = re.search(r"\[.*?\]", raw, re.DOTALL)
        if match:
            import json
            selected_names = json.loads(match.group())
    except Exception as e:
        logger.warning(f"Knowledge selection failed: {e}")
        return ""

    if not selected_names:
        return ""

    # Retrieve bodies of selected files, respecting token cap
    name_to_entry = {e["_name"]: e for e in index}
    parts = []
    total_tokens = 0

    for name in selected_names:
        entry = name_to_entry.get(name)
        if not entry:
            continue
        body = entry.get("_body", "")
        estimated_tokens = len(body) // CHARS_PER_TOKEN
        if total_tokens + estimated_tokens > TOKEN_CAP:
            break
        parts.append(f"### {entry.get('description', name)}\n\n{body}")
        total_tokens += estimated_tokens

    return "\n\n---\n\n".join(parts)
