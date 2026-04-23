import logging
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()  # reads backend/.env in local dev; ignored on HF Spaces

log = logging.getLogger(__name__)

_MODEL_ID = "llama-3.3-70b-versatile"
_TIMEOUT_SECONDS = 15


class GroqError(Exception):
    pass


def is_configured() -> bool:
    return bool(os.getenv("GROQ_API_KEY"))


def generate_answer(messages: list[dict]) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise GroqError("GROQ_API_KEY is not set")

    try:
        client = Groq(api_key=api_key, timeout=_TIMEOUT_SECONDS)
        completion = client.chat.completions.create(
            model=_MODEL_ID,
            messages=messages,
            temperature=0.3,
            max_tokens=500,
        )
    except Exception as e:
        log.error("Groq call failed: %s", e)
        raise GroqError(str(e)) from e

    return (completion.choices[0].message.content or "").strip()
