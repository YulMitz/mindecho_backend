import json
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.prebuilt import create_react_agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_anthropic import ChatAnthropic

from .config import (
    GEMINI_API_KEY,
    ANTHROPIC_API_KEY,
    RAG_LLM_PROVIDER,
    RAG_LLM_MODEL_GEMINI,
    RAG_LLM_MODEL_ANTHROPIC,
    MAX_RETRIEVAL_CALLS,
    CHATBOT_TO_THERAPY_TAG,
)
from .models import RAGRequest, RAGResponse
from .prompts import (
    SUMMARY_PROMPT,
    QUERY_REWRITE_PROMPT,
    REACT_SYSTEM_PROMPT,
    CONTEXT_COMPRESSION_PROMPT,
)
from .tools import search_child_chunks, retrieve_parent_chunks


def _get_llm():
    if RAG_LLM_PROVIDER == "ANTHROPIC":
        return ChatAnthropic(model=RAG_LLM_MODEL_ANTHROPIC, api_key=ANTHROPIC_API_KEY)
    return ChatGoogleGenerativeAI(model=RAG_LLM_MODEL_GEMINI, google_api_key=GEMINI_API_KEY)


async def run_rag_pipeline(request: RAGRequest) -> RAGResponse:
    therapy_tag = CHATBOT_TO_THERAPY_TAG.get(request.chatbot_type)
    if not therapy_tag:
        return RAGResponse(success=False, error=f"Unknown chatbot_type: {request.chatbot_type}")

    llm = _get_llm()

    # 1. Summarize conversation history
    history_text = "\n".join(
        f"{m['role']}: {m['content']}" for m in request.conversation_history[-10:]
    ) or "(no prior history)"
    summary_response = await llm.ainvoke(SUMMARY_PROMPT.format(history=history_text))
    summary = summary_response.content.strip()

    # 2. Rewrite query into sub-questions
    rewrite_response = await llm.ainvoke(
        QUERY_REWRITE_PROMPT.format(summary=summary, query=request.query)
    )
    try:
        rewritten = json.loads(rewrite_response.content.strip())
        if not isinstance(rewritten, list):
            rewritten = [request.query]
    except Exception:
        rewritten = [request.query]

    # 3. ReAct retrieval agent
    react_system = REACT_SYSTEM_PROMPT.format(
        therapy_tag=therapy_tag,
        summary=summary,
        queries=rewritten,
        max_calls=MAX_RETRIEVAL_CALLS,
    )
    agent = create_react_agent(
        model=llm,
        tools=[search_child_chunks, retrieve_parent_chunks],
    )
    agent_input = {
        "messages": [
            SystemMessage(content=react_system),
            HumanMessage(content=f"Retrieve relevant context for: {request.query}"),
        ]
    }
    agent_result = await agent.ainvoke(agent_input)

    # 4. Collect context fragments from tool call results
    passages: list[str] = []
    sources: set[str] = set()
    for msg in agent_result.get("messages", []):
        # ToolMessage has a `name` attribute
        if hasattr(msg, "name") and msg.name in ("search_child_chunks", "retrieve_parent_chunks"):
            try:
                data = json.loads(msg.content)
                if isinstance(data, list):
                    for item in data:
                        if item.get("text"):
                            passages.append(item["text"])
                        if item.get("source"):
                            sources.add(item["source"])
                elif isinstance(data, dict):
                    for text in data.values():
                        if text:
                            passages.append(text)
            except Exception:
                pass

    if not passages:
        return RAGResponse(success=True, context="", sources=[])

    # 5. Compress into coherent context
    compression_response = await llm.ainvoke(
        CONTEXT_COMPRESSION_PROMPT.format(
            therapy_tag=therapy_tag,
            query=request.query,
            passages="\n\n---\n\n".join(passages[:10]),
        )
    )
    context = compression_response.content.strip()

    return RAGResponse(context=context, sources=list(sources), success=True)