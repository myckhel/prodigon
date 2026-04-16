"""
Model manager — handles model selection and fallback logic.

In production AI systems, you rarely rely on a single model. The ModelManager
provides a layer that can:
  - Use a default model or respect client overrides
  - Fall back to a cheaper/faster model if the primary fails
  - Log model usage for capacity planning

Why this exists:
    Hardcoding model names into route handlers means every change requires
    a code deploy. A ModelManager centralizes model selection logic and makes
    it easy to add A/B testing, canary rollouts, or cost-based routing later.
"""

from shared.errors import InferenceError
from shared.logging import get_logger

logger = get_logger(__name__)


class ModelManager:
    """Manages model selection and provides fallback behavior."""

    def __init__(self, groq_client, default_model: str, fallback_model: str):
        self.groq_client = groq_client
        self.default_model = default_model
        self.fallback_model = fallback_model

    def resolve_model(self, requested_model: str | None) -> str:
        """Return the model to use: client override > default."""
        return requested_model or self.default_model

    async def generate(
        self,
        prompt: str,
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
        system_prompt: str | None = None,
    ) -> dict:
        """Generate text with automatic fallback on failure.

        Tries the requested (or default) model first. If it fails,
        retries with the fallback model before raising an error.
        """
        target_model = self.resolve_model(model)

        try:
            return await self.groq_client.generate(
                prompt=prompt,
                model=target_model,
                max_tokens=max_tokens,
                temperature=temperature,
                system_prompt=system_prompt,
            )
        except Exception as primary_err:
            if target_model == self.fallback_model:
                logger.error("inference_failed_no_fallback", model=target_model, error=str(primary_err))
                raise InferenceError(f"Inference failed with {target_model}: {primary_err}") from primary_err

            logger.warning(
                "primary_model_failed_trying_fallback",
                primary=target_model,
                fallback=self.fallback_model,
                error=str(primary_err),
            )

            try:
                return await self.groq_client.generate(
                    prompt=prompt,
                    model=self.fallback_model,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    system_prompt=system_prompt,
                )
            except Exception as fallback_err:
                logger.error(
                    "fallback_model_also_failed",
                    primary=target_model,
                    fallback=self.fallback_model,
                    error=str(fallback_err),
                )
                raise InferenceError(
                    f"Both {target_model} and {self.fallback_model} failed"
                ) from fallback_err

    async def generate_stream(
        self,
        prompt: str,
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
        system_prompt: str | None = None,
    ):
        """Stream tokens with automatic fallback on failure.

        Tries the requested (or default) model. If it fails before yielding
        any tokens, retries with the fallback model.
        """
        target_model = self.resolve_model(model)

        try:
            async for token in self.groq_client.generate_stream(
                prompt=prompt,
                model=target_model,
                max_tokens=max_tokens,
                temperature=temperature,
                system_prompt=system_prompt,
            ):
                yield token
        except Exception as primary_err:
            if target_model == self.fallback_model:
                logger.error("stream_failed_no_fallback", model=target_model, error=str(primary_err))
                raise InferenceError(f"Streaming failed with {target_model}: {primary_err}") from primary_err

            logger.warning(
                "stream_primary_failed_trying_fallback",
                primary=target_model,
                fallback=self.fallback_model,
                error=str(primary_err),
            )

            try:
                async for token in self.groq_client.generate_stream(
                    prompt=prompt,
                    model=self.fallback_model,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    system_prompt=system_prompt,
                ):
                    yield token
            except Exception as fallback_err:
                logger.error("stream_fallback_also_failed", error=str(fallback_err))
                raise InferenceError(
                    f"Streaming failed with both {target_model} and {self.fallback_model}"
                ) from fallback_err
