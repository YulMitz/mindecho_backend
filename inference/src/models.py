from pydantic import BaseModel
from typing import Any


class Message(BaseModel):
    role: str  # "user" or "model"
    content: str


class GenerateRequest(BaseModel):
    session_id: str
    chatbot_type: str  # "CBT" | "MBT" | "MBCT" | "INITIAL"
    message: str
    conversation_history: list[Message]
    provider: str = "GEMINI"  # "GEMINI" | "ANTHROPIC"
    prompt_options: dict[str, Any] = {}


class GenerateResponse(BaseModel):
    text: str
    usage: dict[str, Any] | None = None
