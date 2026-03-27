from typing import Annotated
from pydantic import BaseModel
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages


# === API Request / Response ===

class RAGRequest(BaseModel):
    session_id: str
    chatbot_type: str                        # CBT | MBT | MBCT | DBT
    query: str
    conversation_history: list[dict] = []   # [{"role": "user"|"model", "content": "..."}]


class RAGResponse(BaseModel):
    context: str = ""
    sources: list[str] = []
    success: bool = True
    error: str | None = None


# === LangGraph State ===

class RAGState(TypedDict):
    """State flowing through the LangGraph pipeline."""
    query: str
    chatbot_type: str
    therapy_tag: str
    conversation_summary: str
    rewritten_queries: list[str]
    retrieved_chunk_ids: list[str]
    context_fragments: list[str]
    sources: list[str]
    messages: Annotated[list, add_messages]  # ReAct agent message log