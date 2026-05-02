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

# Phase 2.2 — bound the number of in-flight outbound LLM calls per worker
# process. Excess requests await the semaphore instead of fanning out and
# tripping provider rate limits. With uvicorn workers=4 (Phase 1.4), the
# effective ceiling is MAX_CONCURRENT_LLM_CALLS * 4. Tune via env.
_MAX_CONCURRENT_LLM_CALLS = int(os.environ.get("MAX_CONCURRENT_LLM_CALLS", "20"))
_llm_semaphore = asyncio.Semaphore(_MAX_CONCURRENT_LLM_CALLS)
logger.info(
    f"LLM concurrency semaphore initialized: max={_MAX_CONCURRENT_LLM_CALLS} per worker"
)


@router.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest) -> GenerateResponse:
    history = [{"role": m.role, "content": m.content} for m in req.conversation_history]

    # Step 1: knowledge selection (skipped for INITIAL mode — no knowledge corpus yet)
    knowledge_context = ""
    if req.chatbot_type in THERAPY_MODES:
        try:
            async with _llm_semaphore:
                knowledge_context = await pick_knowledge(
                    chatbot_type=req.chatbot_type,
                    conversation_history=history,
                    message=req.message,
                    provider=req.provider,
                )
        except Exception as e:
            logger.warning(f"Knowledge selection failed, proceeding without context: {e}")

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
        async with _llm_semaphore:
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
