"""Unit tests for JobStore CRUD operations."""


def test_create_job(job_store):
    job = job_store.create_job("test-001", user_id="alice")
    assert job["job_id"] == "test-001"
    assert job["user_id"] == "alice"
    assert job["status"] == "pending"
    assert job["progress"] == 0


def test_get_job(job_store):
    job_store.create_job("test-002", user_id="alice")
    job = job_store.get_job("test-002")
    assert job is not None
    assert job["job_id"] == "test-002"


def test_get_job_not_found(job_store):
    assert job_store.get_job("nonexistent") is None


def test_update_job(job_store):
    job_store.create_job("test-003", user_id="alice")
    updated = job_store.update_job("test-003", status="completed", progress=100)
    assert updated["status"] == "completed"
    assert updated["progress"] == 100


def test_update_job_with_metadata(job_store):
    job_store.create_job("test-004", user_id="alice")
    updated = job_store.update_job(
        "test-004",
        company_name="Acme Corp",
        job_title="Engineer",
        backend_type="gemini",
    )
    assert updated["company_name"] == "Acme Corp"
    assert updated["job_title"] == "Engineer"
    assert updated["backend_type"] == "gemini"


def test_list_jobs_by_user(job_store):
    job_store.create_job("test-005", user_id="bob")
    job_store.create_job("test-006", user_id="carol")
    bob_jobs = job_store.list_jobs(user_id="bob")
    assert any(j["job_id"] == "test-005" for j in bob_jobs)
    assert not any(j["job_id"] == "test-006" for j in bob_jobs)


def test_delete_job(job_store):
    job_store.create_job("test-007", user_id="alice")
    job_store.delete_job("test-007", user_id="alice")
    assert job_store.get_job("test-007") is None
