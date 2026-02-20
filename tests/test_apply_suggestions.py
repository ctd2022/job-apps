"""Tests for /apply-suggestions endpoint — verifies #123 backend override params."""
import pytest


@pytest.mark.asyncio
async def test_apply_suggestions_accepts_backend_override(test_client, job_store):
    """POST /api/jobs/{id}/apply-suggestions should accept backend_type and model_name."""
    # Create a completed job (won't actually run LLM — just checks request parsing)
    job_store.create_job("as-001", user_id="default")
    job_store.update_job(
        "as-001",
        status="completed",
        progress=100,
        backend_type="ollama",
    )

    body = {
        "cv_version_id": 999,  # Non-existent — will fail at CV lookup
        "selected_keywords": ["python", "kubernetes"],
        "backend_type": "gemini",
        "model_name": "gemini-2.0-flash",
    }

    resp = await test_client.post(
        "/api/jobs/as-001/apply-suggestions",
        json=body,
        headers={"X-User-ID": "default"},
    )
    # Expect 404 because CV version 999 doesn't exist, but request was parsed OK
    assert resp.status_code == 404
    assert "CV version" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_apply_suggestions_rejects_empty_keywords(test_client, job_store):
    """Should reject empty keyword list with 400."""
    job_store.create_job("as-002", user_id="default")
    job_store.update_job("as-002", status="completed", progress=100)

    body = {
        "cv_version_id": 1,
        "selected_keywords": [],
    }

    resp = await test_client.post(
        "/api/jobs/as-002/apply-suggestions",
        json=body,
        headers={"X-User-ID": "default"},
    )
    assert resp.status_code == 400
