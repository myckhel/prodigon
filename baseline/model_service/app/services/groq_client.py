"""
Groq API client wrapper for LLM inference.

Encapsulates all Groq SDK interactions behind a clean interface. Supports both
synchronous generation and streaming. Includes a mock client for offline/testing use.

Why wrap the SDK:
    Direct SDK calls scattered across the codebase make it impossible to swap providers,
    add caching, or instrument latency. A wrapper provides a single integration point
    and a seam for testing (swap in MockGroqClient without touching business logic).
"""

import time
from collections.abc import AsyncIterator

from groq import AsyncGroq

from shared.logging import get_logger

logger = get_logger(__name__)


class GroqInferenceClient:
    """Production client that calls the Groq API for text generation."""

    def __init__(self, api_key: str):
        self._client = AsyncGroq(api_key=api_key)
        logger.info("groq_client_initialized")

    async def generate(
        self,
        prompt: str,
        model: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
        system_prompt: str | None = None,
    ) -> dict:
        """Generate text from a prompt.

        Returns:
            dict with keys: text, model, usage, latency_ms
        """
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        start = time.perf_counter()

        response = await self._client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )

        latency_ms = (time.perf_counter() - start) * 1000

        result = {
            "text": response.choices[0].message.content,
            "model": response.model,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            },
            "latency_ms": round(latency_ms, 2),
        }

        logger.info(
            "inference_completed",
            model=response.model,
            latency_ms=result["latency_ms"],
            tokens=result["usage"]["total_tokens"],
        )

        return result

    async def generate_stream(
        self,
        prompt: str,
        model: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
        system_prompt: str | None = None,
    ) -> AsyncIterator[str]:
        """Stream generated text token by token."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        stream = await self._client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


class MockGroqClient:
    """Mock client for testing and offline development.

    Returns deterministic responses without making API calls.
    Activated by setting USE_MOCK=true in environment.
    """

    async def generate(
        self,
        prompt: str,
        model: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
        system_prompt: str | None = None,
    ) -> dict:
        mock_text = (
            f"[Mock response for model={model}] "
            f"This is a simulated response to: '{prompt[:80]}...'"
        )
        logger.info("mock_inference", model=model, prompt_length=len(prompt))
        return {
            "text": mock_text,
            "model": f"{model}-mock",
            "usage": {"prompt_tokens": len(prompt) // 4, "completion_tokens": 20, "total_tokens": len(prompt) // 4 + 20},
            "latency_ms": 5.0,
        }

    async def generate_stream(
        self,
        prompt: str,
        model: str,
        max_tokens: int = 1024,
        temperature: float = 0.7,
        system_prompt: str | None = None,
    ) -> AsyncIterator[str]:
        words = f"[Mock stream for {model}] Simulated response to: {prompt[:50]}".split()
        for word in words:
            yield word + " "
