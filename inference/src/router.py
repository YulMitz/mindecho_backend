import asyncio
import logging
import os

from fastapi import APIRouter, HTTPException

from .models import GenerateRequest, GenerateResponse
from .prompts import get_system_prompt
from .knowledge import pick_knowledge
from . import providers

logger = logging.getLogger(__name__)

router = APIRouter()

THERAPY_MODES = {"CBT", "MBT", "MBCT", "DBT"}

# Phase 2.2 — bound the number of in-flight outbound LLM work per worker
# process. Excess requests await the semaphore instead of fanning out and
# tripping provider rate limits. With uvicorn workers=4 (Phase 1.4), the
# effective ceiling is MAX_CONCURRENT_LLM_CALLS * 4. Tune via env.
#
# Scope: ONE acquire wraps the entire /generate request (Step 1 selector +
# Step 2 generation). This caps in-flight *requests* rather than individual
# LLM calls, which avoids the two-stage wave pattern where every request
# clears Step 1 before any reaches Step 2. Trade-off: a request that would
# fire 1-3 sequential LLM calls now holds one slot for the full duration,
# so the env value should be tuned with that in mind.
_DEFAULT_MAX_CONCURRENT_LLM_CALLS = 20


def _resolve_max_concurrent_llm_calls() -> int:
    """Parse MAX_CONCURRENT_LLM_CALLS from env, with safe fallbacks.

    Bad / missing values fall back to the default rather than crashing app
    startup or — worse — silently building a Semaphore(0) that deadlocks
    every request.
    """
    raw = os.environ.get("MAX_CONCURRENT_LLM_CALLS")
    if raw is None or raw == "":
        return _DEFAULT_MAX_CONCURRENT_LLM_CALLS
    try:
        value = int(raw)
    except (TypeError, ValueError):
        logger.warning(
            "Invalid MAX_CONCURRENT_LLM_CALLS=%r (not an integer); "
            "falling back to default %d",
            raw,
            _DEFAULT_MAX_CONCURRENT_LLM_CALLS,
        )
        return _DEFAULT_MAX_CONCURRENT_LLM_CALLS
    if value <= 0:
        logger.warning(
            "Non-positive MAX_CONCURRENT_LLM_CALLS=%r would deadlock the "
            "endpoint; falling back to default %d",
            raw,
            _DEFAULT_MAX_CONCURRENT_LLM_CALLS,
        )
        return _DEFAULT_MAX_CONCURRENT_LLM_CALLS
    return value


_MAX_CONCURRENT_LLM_CALLS = _resolve_max_concurrent_llm_calls()
_llm_semaphore = asyncio.Semaphore(_MAX_CONCURRENT_LLM_CALLS)
logger.info(
    f"LLM concurrency semaphore initialized: max={_MAX_CONCURRENT_LLM_CALLS} "
    f"per worker (whole-request scope)"
)


@router.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest) -> GenerateResponse:
    history = [{"role": m.role, "content": m.content} for m in req.conversation_history]

    # Single semaphore acquire wraps the entire request — Step 1 selector and
    # Step 2 generation share one slot. `async with` guarantees the permit is
    # released even on exceptions raised from either step.
    async with _llm_semaphore:
        # Step 1: knowledge selection (skipped for INITIAL mode — no corpus)
        knowledge_context = ""
        if req.chatbot_type in THERAPY_MODES:
            try:
                knowledge_context = await pick_knowledge(
                    chatbot_type=req.chatbot_type,
                    conversation_history=history,
                    message=req.message,
                    provider=req.provider,
                )
            except Exception as e:
                logger.warning(
                    f"Knowledge selection failed, proceeding without context: {e}"
                )

        # Build system prompt with optional knowledge context appended
        system_prompt = get_system_prompt(req.chatbot_type, req.prompt_options)
        if knowledge_context:
            system_prompt = (
                f"{system_prompt}\n\n"
                f"**Reference Knowledge**\n"
                f"The following summaries from therapy literature are relevant to this conversation. "
                f"Use them to inform your approach, but do not reference them directly to the person.\n\n"
                f"{knowledge_context}"
            )

        # Step 2: therapy response generation
        try:
            if req.provider == "ANTHROPIC":
                result = await providers.anthropic.generate(system_prompt, history, req.message)
            else:
                result = await providers.gemini.generate(system_prompt, history, req.message)
        except Exception as e:
            logger.error(f"Provider error: {e}")
            raise HTTPException(status_code=502, detail=str(e))

    return GenerateResponse(
        text=result["text"],
        model=result.get("model"),
        usage=result.get("usage"),
    )
