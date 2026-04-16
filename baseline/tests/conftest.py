"""
Shared test fixtures for all service tests.

Sets up mock mode and provides reusable test client factories.
"""

import os
import pytest
from unittest.mock import AsyncMock

# Force mock mode for all tests
os.environ["USE_MOCK"] = "true"
os.environ["GROQ_API_KEY"] = "test-key"
os.environ["ENVIRONMENT"] = "test"


@pytest.fixture
def mock_groq_response():
    """Standard mock response matching Groq API shape."""
    return {
        "text": "This is a mock generated response.",
        "model": "llama-3.3-70b-versatile-mock",
        "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
        "latency_ms": 5.0,
    }


@pytest.fixture
def mock_service_client():
    """Mock ServiceClient for testing gateway proxy logic."""
    client = AsyncMock()
    client.post = AsyncMock()
    client.get = AsyncMock()
    return client
