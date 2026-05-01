import os
from google import genai

_api_key = os.environ.get("GEMINI_API_KEY")
_model = os.environ.get("GEMINI_MODEL_NAME", "gemini-2.0-flash")
_client = genai.Client(api_key=_api_key)


async def generate(
    system_prompt: str,
    conversation_history: list[dict],
    message: str,
) -> dict:

    history = [
        genai.types.Content(
            role=msg["role"],
            parts=[genai.types.Part(text=msg["content"])],
        )
        for msg in conversation_history
    ]

    chat = _client.aio.chats.create(
        model=_model,
        config=genai.types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.7,
            top_p=0.9,
            max_output_tokens=8192,
        ),
        history=history,
    )
    response = await chat.send_message(message)

    return {
        "text": response.text,
        "model": _model,
        "usage": {
            "input_tokens": response.usage_metadata.prompt_token_count
            if response.usage_metadata
            else None,
            "output_tokens": response.usage_metadata.candidates_token_count
            if response.usage_metadata
            else None,
        },
    }
