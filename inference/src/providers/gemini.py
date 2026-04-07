import os
from google import genai


async def generate(
    system_prompt: str,
    conversation_history: list[dict],
    message: str,
) -> dict:
    api_key = os.environ.get("GEMINI_API_KEY")
    model = os.environ.get("GEMINI_MODEL_NAME", "gemini-2.0-flash")

    client = genai.Client(api_key=api_key)

    history = [
        genai.types.Content(
            role=msg["role"],
            parts=[genai.types.Part(text=msg["content"])],
        )
        for msg in conversation_history
    ]

    chat = client.aio.chats.create(
        model=model,
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
        "usage": {
            "input_tokens": response.usage_metadata.prompt_token_count if response.usage_metadata else None,
            "output_tokens": response.usage_metadata.candidates_token_count if response.usage_metadata else None,
        },
    }
