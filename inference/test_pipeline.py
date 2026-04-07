"""
Smoke test for the two-step inference pipeline.
Run from inference/ with: uv run python test_pipeline.py
"""
import asyncio
import logging
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))
logging.basicConfig(level=logging.INFO, format="  [%(name)s] %(message)s")

from src.knowledge import pick_knowledge
from src.prompts import get_system_prompt
from src.providers import gemini as gemini_provider
from src.providers import anthropic as anthropic_provider


async def test_knowledge_selection():
    print("\n── Step 1: Knowledge Selection ──────────────────────")

    history = [
        {"role": "user", "content": "我跟我媽吵架了，她說了一些很傷人的話，但我不知道她為什麼要這樣說。"},
        {"role": "model", "content": "聽起來那些話讓你很受傷。你有沒有什麼感覺，她當時可能是什麼心情？"},
    ]
    message = "我不知道⋯⋯她可能很累吧，但我也搞不清楚為什麼她要把氣出在我身上。我有時候覺得根本不懂她在想什麼。"

    knowledge = await pick_knowledge(
        chatbot_type="MBT",
        conversation_history=history,
        message=message,
        provider="GEMINI",
    )

    if knowledge:
        preview = knowledge[:400].replace("\n", " ")
        print(f"  ✅ Knowledge selected ({len(knowledge)} chars)")
        print(f"  Preview: {preview}...")
    else:
        print("  ℹ️  No knowledge selected (empty corpus or no match)")

    return knowledge


async def test_full_pipeline_gemini(knowledge: str):
    print("\n── Step 2: Therapy Response (Gemini) ────────────────")

    history = [
        {"role": "user", "content": "我跟我媽吵架了，她說了一些很傷人的話，但我不知道她為什麼要這樣說。"},
        {"role": "model", "content": "聽起來那些話讓你很受傷。你有沒有什麼感覺，她當時可能是什麼心情？"},
    ]
    message = "我不知道⋯⋯她可能很累吧，但我也搞不清楚為什麼她要把氣出在我身上。我有時候覺得根本不懂她在想什麼。"

    system_prompt = get_system_prompt("MBT")
    if knowledge:
        system_prompt += (
            "\n\n**Reference Knowledge**\n"
            "The following summaries from therapy literature are relevant. "
            "Use them to inform your approach, but do not reference them directly.\n\n"
            + knowledge
        )

    result = await gemini_provider.generate(system_prompt, history, message)
    print(f"  ✅ Response received ({len(result['text'])} chars)")
    print(f"  Usage: {result['usage']}")
    print(f"\n  Response:\n  {result['text']}")
    return result


async def test_full_pipeline_anthropic(knowledge: str):
    print("\n── Step 2: Therapy Response (Anthropic) ─────────────")

    history = [
        {"role": "user", "content": "我跟我媽吵架了，她說了一些很傷人的話，但我不知道她為什麼要這樣說。"},
        {"role": "model", "content": "聽起來那些話讓你很受傷。你有沒有什麼感覺，她當時可能是什麼心情？"},
    ]
    message = "我不知道⋯⋯她可能很累吧，但我也搞不清楚為什麼她要把氣出在我身上。我有時候覺得根本不懂她在想什麼。"

    system_prompt = get_system_prompt("MBT")
    if knowledge:
        system_prompt += (
            "\n\n**Reference Knowledge**\n"
            "The following summaries from therapy literature are relevant. "
            "Use them to inform your approach, but do not reference them directly.\n\n"
            + knowledge
        )

    result = await anthropic_provider.generate(system_prompt, history, message)
    print(f"  ✅ Response received ({len(result['text'])} chars)")
    print(f"  Usage: {result['usage']}")
    print(f"\n  Response:\n  {result['text']}")
    return result


async def main():
    print("🧪 Inference Pipeline Smoke Test")

    try:
        knowledge = await test_knowledge_selection()
    except Exception as e:
        print(f"  ❌ Knowledge selection failed: {e}")
        knowledge = ""

    gemini_key = os.environ.get("GEMINI_API_KEY")
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")

    if gemini_key:
        try:
            await test_full_pipeline_gemini(knowledge)
        except Exception as e:
            print(f"  ❌ Gemini failed: {e}")
    else:
        print("\n── Gemini: skipped (no GEMINI_API_KEY) ──────────────")

    if anthropic_key:
        try:
            await test_full_pipeline_anthropic(knowledge)
        except Exception as e:
            print(f"  ❌ Anthropic failed: {e}")
    else:
        print("\n── Anthropic: skipped (no ANTHROPIC_API_KEY) ────────")

    print("\n✅ Smoke test complete")


asyncio.run(main())
