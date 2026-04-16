"""
Tests for the Model Service.

Uses the MockGroqClient (USE_MOCK=true) so tests run without a real API key.
"""

import pytest
from fastapi.testclient import TestClient

from model_service.app.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestHealth:
    def test_health_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "model-service"

    def test_health_includes_version(self, client):
        response = client.get("/health")
        assert "version" in response.json()


class TestInference:
    def test_generate_returns_200(self, client):
        response = client.post(
            "/inference",
            json={"prompt": "What is Python?", "max_tokens": 100},
        )
        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        assert "model" in data
        assert "latency_ms" in data
        assert "usage" in data

    def test_generate_with_model_override(self, client):
        response = client.post(
            "/inference",
            json={
                "prompt": "Hello",
                "model": "llama-3.1-8b-instant",
                "max_tokens": 50,
            },
        )
        assert response.status_code == 200

    def test_generate_empty_prompt_rejected(self, client):
        response = client.post(
            "/inference",
            json={"prompt": "", "max_tokens": 100},
        )
        assert response.status_code == 422  # Validation error

    def test_generate_with_system_prompt(self, client):
        response = client.post(
            "/inference",
            json={
                "prompt": "Explain AI",
                "system_prompt": "You are a helpful teacher.",
                "max_tokens": 100,
            },
        )
        assert response.status_code == 200
        assert len(response.json()["text"]) > 0
