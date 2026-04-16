"""
Tests for the Worker Service.

Tests job submission and status endpoints. The background worker loop
is not exercised in these unit tests (it requires the model service).
"""

import pytest
from fastapi.testclient import TestClient

from worker_service.app.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestHealth:
    def test_health_returns_200(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "worker-service"


class TestJobs:
    def test_submit_job_returns_202(self, client):
        response = client.post(
            "/jobs",
            json={"prompts": ["What is AI?", "Explain ML"], "max_tokens": 100},
        )
        assert response.status_code == 202
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "pending"
        assert data["total_prompts"] == 2

    def test_get_job_status(self, client):
        # Submit a job first
        submit_resp = client.post(
            "/jobs",
            json={"prompts": ["Hello"], "max_tokens": 50},
        )
        job_id = submit_resp.json()["job_id"]

        # Check status
        status_resp = client.get(f"/jobs/{job_id}")
        assert status_resp.status_code == 200
        data = status_resp.json()
        assert data["job_id"] == job_id
        assert data["total_prompts"] == 1

    def test_get_nonexistent_job_returns_404(self, client):
        response = client.get("/jobs/nonexistent-id")
        assert response.status_code == 404

    def test_submit_empty_prompts_rejected(self, client):
        response = client.post(
            "/jobs",
            json={"prompts": [], "max_tokens": 100},
        )
        assert response.status_code == 422
