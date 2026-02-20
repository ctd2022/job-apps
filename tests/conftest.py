"""Shared fixtures for backend tests."""
import sys
import tempfile
from pathlib import Path

import pytest

# Ensure project root and src/ are importable
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))
sys.path.insert(0, str(PROJECT_ROOT))

# Redirect DB to temp file BEFORE importing job_store
_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp_db.close()

import backend.job_store as _js  # noqa: E402
_js.DB_PATH = Path(_tmp_db.name)
_js.init_db()


@pytest.fixture()
def test_client():
    """Async TestClient backed by a temp database."""
    from httpx import ASGITransport, AsyncClient
    from backend.main import app

    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.fixture()
def job_store():
    """JobStore instance using temp DB."""
    return _js.JobStore()


@pytest.fixture()
def cv_store():
    """CVStore instance using temp DB."""
    return _js.CVStore()
