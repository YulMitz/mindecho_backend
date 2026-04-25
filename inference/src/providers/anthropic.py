import os
import anthropic

_api_key = os.environ.get("ANTHROPIC_API_KEY")
_model = os.environ.get("ANTHROPIC_MODEL_NAME", "claude-haiku-4-5-20251001")
_client = anthropic.AsyncAnthropic(api_key=_api_key)


async def generate(
    system_prompt: str,
    conversation_history: list[dict],
    message: str,
) -> dict:

    messages = [
        {
            "role": msg["role"] if msg["role"] != "model" else "assistant",
            "content": msg["content"],
        }
        for msg in conversation_history
    ]
    messages.append({"role": "user", "content": message})

    response = await _client.messages.create(
        model=_model,
        max_tokens=1000,
        system=system_prompt,
        messages=messages,
    )

    return {
        "text": response.content[0].text,
        "usage": {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
        },
    }
