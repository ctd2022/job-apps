"""Tests for job status endpoint — verifies #124 fields are returned."""
import pytest


@pytest.mark.asyncio
async def test_job_status_returns_new_fields(test_client, job_store):
    """GET /api/jobs/{id} should return backend_type, company_name, job_title, created_at, completed_at."""
    job_store.create_job("ep-001", user_id="default")
    job_store.update_job(
        "ep-001",
        company_name="Acme Corp",
        job_title="Senior Engineer",
        backend_type="gemini",
        status="completed",
        progress=100,
    )

    resp = await test_client.get("/api/jobs/ep-001")
    assert resp.status_code == 200

    data = resp.json()
    assert data["backend_type"] == "gemini"
    assert data["company_name"] == "Acme Corp"
    assert data["job_title"] == "Senior Engineer"
    assert data["created_at"] is not None
    # completed_at derived from updated_at when status == completed
    assert data["completed_at"] is not None


@pytest.mark.asyncio
async def test_job_status_no_completed_at_when_pending(test_client, job_store):
    """completed_at should be None for non-completed jobs."""
    job_store.create_job("ep-002", user_id="default")

    resp = await test_client.get("/api/jobs/ep-002")
    assert resp.status_code == 200

    data = resp.json()
    assert data["completed_at"] is None


@pytest.mark.asyncio
async def test_job_not_found(test_client):
    resp = await test_client.get("/api/jobs/nonexistent")
    assert resp.status_code == 404
