"""
Tests for the API Gateway.

Since the gateway proxies to backend services, these tests mock the
ServiceClient to verify routing and middleware behavior without needing
real backend services running.
"""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api_gateway.app.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestHealth:
    def test_health_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "api-gateway"


class TestMiddleware:
    def test_response_includes_request_id(self, client):
        response = client.get("/health")
        assert "x-request-id" in response.headers

    def test_response_includes_process_time(self, client):
        response = client.get("/health")
        assert "x-process-time" in response.headers

    def test_custom_request_id_propagated(self, client):
        response = client.get("/health", headers={"X-Request-ID": "test-123"})
        assert response.headers["x-request-id"] == "test-123"


class TestGenerate:
    def test_generate_proxies_to_model_service(self, client):
        mock_response = {
            "text": "Generated text",
            "model": "llama-3.3-70b-versatile",
            "usage": {"prompt_tokens": 5, "completion_tokens": 10, "total_tokens": 15},
            "latency_ms": 100.0,
        }

        with patch("api_gateway.app.routes.generate.get_model_client") as mock_dep:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_dep.return_value = mock_client

            response = client.post(
                "/api/v1/generate",
                json={"prompt": "Hello world", "max_tokens": 100},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["text"] == "Generated text"


class TestJobs:
    def test_submit_job_proxies_to_worker(self, client):
        mock_response = {
            "job_id": "abc-123",
            "status": "pending",
            "created_at": "2026-01-01T00:00:00Z",
            "total_prompts": 2,
            "completed_prompts": 0,
            "results": [],
        }

        with patch("api_gateway.app.routes.jobs.get_worker_client") as mock_dep:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_dep.return_value = mock_client

            response = client.post(
                "/api/v1/jobs",
                json={"prompts": ["Prompt 1", "Prompt 2"], "max_tokens": 100},
            )

        assert response.status_code == 202
        assert response.json()["job_id"] == "abc-123"
