import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify that GET /api/health responds with status code 200 and {'status': 'ok'}."""
    response = client.get("/api/health")

    # Verify HTTP status code
    assert response.status_code == 200

    # Verify response structure
    data = response.json()
    assert isinstance(data, dict)
    assert "status" in data

    # Verify status value
    assert data["status"] == "ok"
