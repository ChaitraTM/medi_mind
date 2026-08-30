"""LLM + Voice service abstraction for MediMind.

Keeps the LLM provider behind a service so it can be swapped. Uses the Emergent
Universal Key via emergentintegrations. Every call degrades gracefully so the
application never crashes when a key is missing or a provider is unavailable.
"""
import os
import io
import logging

logger = logging.getLogger("medimind.llm")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "openai")
LLM_MODEL = os.environ.get("LLM_MODEL", "gpt-5.4")


def llm_available() -> bool:
    return bool(EMERGENT_LLM_KEY) and not EMERGENT_LLM_KEY.startswith("sk-emergent-xxxx")


async def generate_text(system_message: str, prompt: str, session_id: str = "medimind") -> tuple[str, bool]:
    """Return (text, used_llm). used_llm=False means a local fallback was used."""
    if not llm_available():
        return "", False
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system_message,
        ).with_model(LLM_PROVIDER, LLM_MODEL)
        resp = await chat.send_message(UserMessage(text=prompt))
        return (resp or "").strip(), True
    except Exception as e:  # noqa: BLE001
        logger.warning("LLM generation failed, using fallback: %s", e)
        return "", False


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> tuple[str, bool]:
    """Speech-to-text via OpenAI Whisper (Universal Key). Returns (text, ok)."""
    if not llm_available():
        return "", False
    try:
        from emergentintegrations.llm.openai.speech_to_text import OpenAISpeechToText
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        buf = io.BytesIO(audio_bytes)
        buf.name = filename
        resp = await stt.transcribe(file=buf, model="whisper-1", response_format="json")
        text = getattr(resp, "text", None) or (resp.get("text") if isinstance(resp, dict) else str(resp))
        return (text or "").strip(), True
    except Exception as e:  # noqa: BLE001
        logger.warning("STT failed: %s", e)
        return "", False


async def synthesize_speech(text: str, voice: str = "nova") -> tuple[str, bool]:
    """Text-to-speech via OpenAI TTS (Universal Key). Returns (base64_mp3, ok)."""
    if not llm_available():
        return "", False
    try:
        from emergentintegrations.llm.openai.text_to_speech import OpenAITextToSpeech
        tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
        b64 = await tts.generate_speech_base64(text=text[:4000], model="tts-1", voice=voice)
        return b64, True
    except Exception as e:  # noqa: BLE001
        logger.warning("TTS failed: %s", e)
        return "", False
