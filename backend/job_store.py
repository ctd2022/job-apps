#!/usr/bin/env python3
"""
SQLite-backed Job Store for persistent job history.

This replaces the in-memory store so jobs persist across server restarts.
"""

import sqlite3
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum


class JobStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class OutcomeStatus(str, Enum):
    """Application outcome status - tracks what happens after documents are generated."""
    draft = "draft"           # Documents generated, not yet submitted
    submitted = "submitted"   # Application submitted to company
    response = "response"     # Got a response (not interview)
    interview = "interview"   # Interview scheduled/completed
    offer = "offer"           # Received job offer
    rejected = "rejected"     # Application rejected
    withdrawn = "withdrawn"   # Candidate withdrew application


# Database path - in project root
DB_PATH = Path(__file__).parent.parent / "jobs.db"


def get_connection() -> sqlite3.Connection:
    """Get a database connection with row factory."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize the database schema."""
    conn = get_connection()
    cursor = conn.cursor()

    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')

    # Jobs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS jobs (
            job_id TEXT PRIMARY KEY,
            user_id TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            progress INTEGER NOT NULL DEFAULT 0,
            current_step TEXT,
            message TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            output_dir TEXT,
            ats_score REAL,
            files TEXT,  -- JSON array
            error TEXT,
            cv_path TEXT,
            job_desc_path TEXT,
            company_name TEXT,
            backend_type TEXT
        )
    ''')

    # CVs table - store user CVs for reuse
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cvs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            name TEXT NOT NULL,
            filename TEXT NOT NULL,
            content TEXT NOT NULL,
            is_default INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    # Create basic indexes
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_cvs_is_default ON cvs(is_default DESC)
    ''')

    # Migration: Add outcome tracking columns (for existing databases)
    # These ALTER TABLE statements are idempotent - they'll fail silently if columns exist
    outcome_columns = [
        ("outcome_status", "TEXT DEFAULT 'draft'"),
        ("submitted_at", "TEXT"),
        ("response_at", "TEXT"),
        ("outcome_at", "TEXT"),
        ("notes", "TEXT"),
        ("job_title", "TEXT"),  # Track 2.8: Job title for human-readable display
        ("job_description_text", "TEXT"),  # Track 2.9: Store full JD text for viewing
    ]

    for col_name, col_type in outcome_columns:
        try:
            cursor.execute(f"ALTER TABLE jobs ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError:
            # Column already exists, ignore
            pass

    # Migration: Add user_id columns (for existing databases)
    for table in ["jobs", "cvs"]:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN user_id TEXT")
        except sqlite3.OperationalError:
            # Column already exists, ignore
            pass

    # Create indexes for migrated columns (must come AFTER migration)
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_jobs_outcome_status ON jobs(outcome_status)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_cvs_user_id ON cvs(user_id)
    ''')

    # Create default user if not exists and migrate orphaned data
    cursor.execute("SELECT id FROM users WHERE id = 'default'")
    if not cursor.fetchone():
        now = datetime.now().isoformat()
        cursor.execute(
            "INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)",
            ("default", "Default User", now)
        )
        # Migrate existing data to default user
        cursor.execute("UPDATE jobs SET user_id = 'default' WHERE user_id IS NULL")
        cursor.execute("UPDATE cvs SET user_id = 'default' WHERE user_id IS NULL")
        print("[OK] Created default user and migrated existing data")

    conn.commit()
    conn.close()
    print(f"[OK] Job store initialized at {DB_PATH}")


class UserStore:
    """SQLite-backed store for user profiles."""

    def __init__(self):
        init_db()

    def create_user(self, name: str) -> Dict[str, Any]:
        """Create a new user."""
        import uuid
        conn = get_connection()
        cursor = conn.cursor()

        user_id = str(uuid.uuid4())[:8]  # Short unique ID
        now = datetime.now().isoformat()

        cursor.execute('''
            INSERT INTO users (id, name, created_at)
            VALUES (?, ?, ?)
        ''', (user_id, name, now))

        conn.commit()
        conn.close()

        return self.get_user(user_id)

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()

        conn.close()

        if not row:
            return None

        return {
            "id": row["id"],
            "name": row["name"],
            "created_at": row["created_at"],
        }

    def list_users(self) -> List[Dict[str, Any]]:
        """List all users."""
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM users ORDER BY created_at ASC")
        rows = cursor.fetchall()

        conn.close()

        return [{
            "id": row["id"],
            "name": row["name"],
            "created_at": row["created_at"],
        } for row in rows]


class JobStore:
    """SQLite-backed store for job processing status."""

    def __init__(self):
        init_db()

    def create_job(self, job_id: str, user_id: str = "default") -> Dict[str, Any]:
        """Create a new job entry."""
        conn = get_connection()
        cursor = conn.cursor()

        now = datetime.now().isoformat()
        job = {
            "job_id": job_id,
            "user_id": user_id,
            "status": JobStatus.pending.value,
            "progress": 0,
            "current_step": "Initializing",
            "message": "Job created, waiting to start",
            "created_at": now,
            "updated_at": now,
            "output_dir": None,
            "ats_score": None,
            "files": [],
            "error": None,
            "cv_path": None,
            "job_desc_path": None,
            "company_name": None,
            "job_title": None,
            "backend_type": None,
            # Outcome tracking fields
            "outcome_status": OutcomeStatus.draft.value,
            "submitted_at": None,
            "response_at": None,
            "outcome_at": None,
            "notes": None,
            "job_description_text": None,
        }

        cursor.execute('''
            INSERT INTO jobs (
                job_id, user_id, status, progress, current_step, message,
                created_at, updated_at, output_dir, ats_score, files,
                error, cv_path, job_desc_path, company_name, job_title, backend_type,
                outcome_status, submitted_at, response_at, outcome_at, notes, job_description_text
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            job["job_id"], job["user_id"], job["status"], job["progress"], job["current_step"],
            job["message"], job["created_at"], job["updated_at"], job["output_dir"],
            job["ats_score"], json.dumps(job["files"]), job["error"],
            job["cv_path"], job["job_desc_path"], job["company_name"], job["job_title"], job["backend_type"],
            job["outcome_status"], job["submitted_at"], job["response_at"],
            job["outcome_at"], job["notes"], job["job_description_text"]
        ))

        conn.commit()
        conn.close()
        return job

    def update_job(self, job_id: str, user_id: str = None, **kwargs) -> Dict[str, Any]:
        """Update job status. If user_id provided, verifies ownership."""
        conn = get_connection()
        cursor = conn.cursor()

        # Check if job exists (and optionally verify ownership)
        if user_id:
            cursor.execute("SELECT * FROM jobs WHERE job_id = ? AND user_id = ?", (job_id, user_id))
        else:
            cursor.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise KeyError(f"Job {job_id} not found")

        # Build update query
        kwargs["updated_at"] = datetime.now().isoformat()

        # Handle files array - convert to JSON
        if "files" in kwargs:
            kwargs["files"] = json.dumps(kwargs["files"])

        # Handle status enum
        if "status" in kwargs and hasattr(kwargs["status"], "value"):
            kwargs["status"] = kwargs["status"].value

        updates = []
        params = []
        for key, value in kwargs.items():
            updates.append(f"{key} = ?")
            params.append(value)

        params.append(job_id)
        query = f"UPDATE jobs SET {', '.join(updates)} WHERE job_id = ?"
        cursor.execute(query, params)

        conn.commit()

        # Fetch and return updated job
        job = self.get_job(job_id)
        conn.close()
        return job

    def get_job(self, job_id: str, user_id: str = None) -> Optional[Dict[str, Any]]:
        """Get job by ID. If user_id provided, verifies ownership."""
        conn = get_connection()
        cursor = conn.cursor()

        if user_id:
            cursor.execute("SELECT * FROM jobs WHERE job_id = ? AND user_id = ?", (job_id, user_id))
        else:
            cursor.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,))
        row = cursor.fetchone()

        conn.close()

        if not row:
            return None

        return self._row_to_dict(row)

    def list_jobs(self, user_id: str = None, limit: int = 50, outcome_status: str = None) -> List[Dict[str, Any]]:
        """List recent jobs, optionally filtered by user_id and outcome status."""
        conn = get_connection()
        cursor = conn.cursor()

        # Build query dynamically based on filters
        conditions = []
        params = []

        if user_id:
            conditions.append("user_id = ?")
            params.append(user_id)

        if outcome_status:
            conditions.append("outcome_status = ?")
            params.append(outcome_status)

        query = "SELECT * FROM jobs"
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()

        conn.close()

        return [self._row_to_dict(row) for row in rows]

    def delete_job(self, job_id: str, user_id: str = None) -> bool:
        """Delete job from store. If user_id provided, verifies ownership."""
        conn = get_connection()
        cursor = conn.cursor()

        if user_id:
            cursor.execute("DELETE FROM jobs WHERE job_id = ? AND user_id = ?", (job_id, user_id))
        else:
            cursor.execute("DELETE FROM jobs WHERE job_id = ?", (job_id,))
        deleted = cursor.rowcount > 0

        conn.commit()
        conn.close()

        return deleted

    def get_outcome_metrics(self, user_id: str = None) -> Dict[str, Any]:
        """Calculate funnel metrics across completed jobs, optionally filtered by user."""
        conn = get_connection()
        cursor = conn.cursor()

        # Build WHERE clause
        where_clause = "WHERE status = 'completed'"
        params = []
        if user_id:
            where_clause += " AND user_id = ?"
            params.append(user_id)

        # Count by outcome status (only for completed jobs)
        cursor.execute(f'''
            SELECT outcome_status, COUNT(*) as count
            FROM jobs
            {where_clause}
            GROUP BY outcome_status
        ''', params)
        by_status = {row["outcome_status"] or "draft": row["count"] for row in cursor.fetchall()}

        # Total completed jobs
        total = sum(by_status.values())

        # Funnel: draft -> submitted -> response -> interview -> offer
        # Each stage includes jobs that progressed further
        funnel = {
            "draft": total,  # All completed jobs started as draft
            "submitted": sum(by_status.get(s, 0) for s in ["submitted", "response", "interview", "offer", "rejected", "withdrawn"]),
            "response": sum(by_status.get(s, 0) for s in ["response", "interview", "offer", "rejected"]),
            "interview": sum(by_status.get(s, 0) for s in ["interview", "offer"]),
            "offer": by_status.get("offer", 0),
        }

        # Calculate rates (avoid division by zero)
        submitted_count = funnel["submitted"]
        rates = {
            "response_rate": round((funnel["response"] / submitted_count * 100), 1) if submitted_count > 0 else 0,
            "interview_rate": round((funnel["interview"] / submitted_count * 100), 1) if submitted_count > 0 else 0,
            "offer_rate": round((funnel["offer"] / submitted_count * 100), 1) if submitted_count > 0 else 0,
        }

        # Average time to response (in days)
        response_where = "WHERE submitted_at IS NOT NULL AND response_at IS NOT NULL"
        response_params = []
        if user_id:
            response_where += " AND user_id = ?"
            response_params.append(user_id)

        cursor.execute(f'''
            SELECT submitted_at, response_at
            FROM jobs
            {response_where}
        ''', response_params)
        response_times = []
        for row in cursor.fetchall():
            try:
                submitted = datetime.fromisoformat(row["submitted_at"])
                response = datetime.fromisoformat(row["response_at"])
                days = (response - submitted).days
                response_times.append(days)
            except (ValueError, TypeError):
                pass

        avg_time_to_response_days = round(sum(response_times) / len(response_times), 1) if response_times else None

        conn.close()

        return {
            "total": total,
            "by_status": by_status,
            "funnel": funnel,
            "rates": rates,
            "avg_time_to_response_days": avg_time_to_response_days,
        }

    def update_outcome(self, job_id: str, outcome_status: str, notes: str = None, user_id: str = None) -> Dict[str, Any]:
        """Update job outcome status with automatic timestamp handling. If user_id provided, verifies ownership."""
        conn = get_connection()
        cursor = conn.cursor()

        # Get current job to check status transition (and optionally verify ownership)
        if user_id:
            cursor.execute("SELECT outcome_status FROM jobs WHERE job_id = ? AND user_id = ?", (job_id, user_id))
        else:
            cursor.execute("SELECT outcome_status FROM jobs WHERE job_id = ?", (job_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise KeyError(f"Job {job_id} not found")

        now = datetime.now().isoformat()
        updates = {
            "outcome_status": outcome_status,
            "updated_at": now,
        }

        # Auto-set timestamps based on status transition
        if outcome_status == "submitted":
            updates["submitted_at"] = now
        elif outcome_status in ["response", "interview"]:
            # If we didn't have a response_at yet, set it
            cursor.execute("SELECT response_at FROM jobs WHERE job_id = ?", (job_id,))
            current = cursor.fetchone()
            if not current["response_at"]:
                updates["response_at"] = now
        elif outcome_status in ["offer", "rejected", "withdrawn"]:
            updates["outcome_at"] = now

        # Add notes if provided (append to existing or set new)
        if notes:
            cursor.execute("SELECT notes FROM jobs WHERE job_id = ?", (job_id,))
            current = cursor.fetchone()
            existing_notes = current["notes"] or ""
            if existing_notes:
                updates["notes"] = f"{existing_notes}\n[{now[:10]}] {notes}"
            else:
                updates["notes"] = f"[{now[:10]}] {notes}"

        # Build and execute update query
        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        params = list(updates.values()) + [job_id]
        cursor.execute(f"UPDATE jobs SET {set_clause} WHERE job_id = ?", params)

        conn.commit()
        conn.close()

        return self.get_job(job_id)

    def get_job_description_text(self, job_id: str) -> Optional[str]:
        """Get the stored job description text for a job."""
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT job_description_text, job_desc_path FROM jobs WHERE job_id = ?", (job_id,))
        row = cursor.fetchone()

        conn.close()

        if not row:
            return None

        # Return stored text if available
        if row["job_description_text"]:
            return row["job_description_text"]

        # Fallback: try to read from file path for legacy jobs
        job_desc_path = row["job_desc_path"]
        if job_desc_path:
            try:
                from pathlib import Path
                path = Path(job_desc_path)
                if path.exists():
                    return path.read_text(encoding="utf-8")
            except Exception:
                pass

        return None

    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert a database row to a dictionary."""
        # Handle job_description_text column which may not exist in older databases
        try:
            job_description_text = row["job_description_text"]
        except (IndexError, KeyError):
            job_description_text = None

        return {
            "job_id": row["job_id"],
            "user_id": row["user_id"] or "default",
            "status": row["status"],
            "progress": row["progress"],
            "current_step": row["current_step"],
            "message": row["message"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "output_dir": row["output_dir"],
            "ats_score": row["ats_score"],
            "files": json.loads(row["files"]) if row["files"] else [],
            "error": row["error"],
            "cv_path": row["cv_path"],
            "job_desc_path": row["job_desc_path"],
            "company_name": row["company_name"],
            "job_title": row["job_title"],
            "backend_type": row["backend_type"],
            # Outcome tracking fields
            "outcome_status": row["outcome_status"] or OutcomeStatus.draft.value,
            "submitted_at": row["submitted_at"],
            "response_at": row["response_at"],
            "outcome_at": row["outcome_at"],
            "notes": row["notes"],
            "job_description_text": job_description_text,
        }


class CVStore:
    """SQLite-backed store for user CVs."""

    def __init__(self):
        init_db()

    def create_cv(self, name: str, filename: str, content: str, user_id: str = "default", is_default: bool = False) -> Dict[str, Any]:
        """Create a new CV entry."""
        conn = get_connection()
        cursor = conn.cursor()

        now = datetime.now().isoformat()

        # If this is set as default, clear other defaults for this user first
        if is_default:
            cursor.execute("UPDATE cvs SET is_default = 0 WHERE user_id = ?", (user_id,))

        cursor.execute('''
            INSERT INTO cvs (name, filename, content, user_id, is_default, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (name, filename, content, user_id, 1 if is_default else 0, now, now))

        cv_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return self.get_cv(cv_id)

    def get_cv(self, cv_id: int, user_id: str = None) -> Optional[Dict[str, Any]]:
        """Get CV by ID. If user_id provided, verifies ownership."""
        conn = get_connection()
        cursor = conn.cursor()

        if user_id:
            cursor.execute("SELECT * FROM cvs WHERE id = ? AND user_id = ?", (cv_id, user_id))
        else:
            cursor.execute("SELECT * FROM cvs WHERE id = ?", (cv_id,))
        row = cursor.fetchone()

        conn.close()

        if not row:
            return None

        return self._row_to_dict(row)

    def get_cv_content(self, cv_id: int, user_id: str = None) -> Optional[str]:
        """Get just the CV content by ID (for processing). If user_id provided, verifies ownership."""
        conn = get_connection()
        cursor = conn.cursor()

        if user_id:
            cursor.execute("SELECT content FROM cvs WHERE id = ? AND user_id = ?", (cv_id, user_id))
        else:
            cursor.execute("SELECT content FROM cvs WHERE id = ?", (cv_id,))
        row = cursor.fetchone()

        conn.close()

        if not row:
            return None

        return row["content"]

    def list_cvs(self, user_id: str = None) -> List[Dict[str, Any]]:
        """List CVs (without content for efficiency). If user_id provided, filters by user."""
        conn = get_connection()
        cursor = conn.cursor()

        if user_id:
            cursor.execute('''
                SELECT id, user_id, name, filename, is_default, created_at, updated_at
                FROM cvs WHERE user_id = ? ORDER BY is_default DESC, updated_at DESC
            ''', (user_id,))
        else:
            cursor.execute('''
                SELECT id, user_id, name, filename, is_default, created_at, updated_at
                FROM cvs ORDER BY is_default DESC, updated_at DESC
            ''')
        rows = cursor.fetchall()

        conn.close()

        return [{
            "id": row["id"],
            "user_id": row["user_id"] or "default",
            "name": row["name"],
            "filename": row["filename"],
            "is_default": bool(row["is_default"]),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        } for row in rows]

    def delete_cv(self, cv_id: int, user_id: str = None) -> bool:
        """Delete a CV. If user_id provided, verifies ownership."""
        conn = get_connection()
        cursor = conn.cursor()

        if user_id:
            cursor.execute("DELETE FROM cvs WHERE id = ? AND user_id = ?", (cv_id, user_id))
        else:
            cursor.execute("DELETE FROM cvs WHERE id = ?", (cv_id,))
        deleted = cursor.rowcount > 0

        conn.commit()
        conn.close()

        return deleted

    def set_default(self, cv_id: int, user_id: str = None) -> bool:
        """Set a CV as the default for the user."""
        conn = get_connection()
        cursor = conn.cursor()

        # Get the user_id for this CV if not provided
        if not user_id:
            cursor.execute("SELECT user_id FROM cvs WHERE id = ?", (cv_id,))
            row = cursor.fetchone()
            if row:
                user_id = row["user_id"] or "default"
            else:
                conn.close()
                return False

        # Clear existing default for this user
        cursor.execute("UPDATE cvs SET is_default = 0 WHERE user_id = ?", (user_id,))

        # Set new default (verify ownership if user_id was provided)
        cursor.execute("UPDATE cvs SET is_default = 1, updated_at = ? WHERE id = ? AND user_id = ?",
                       (datetime.now().isoformat(), cv_id, user_id))
        updated = cursor.rowcount > 0

        conn.commit()
        conn.close()

        return updated

    def get_default_cv(self, user_id: str = None) -> Optional[Dict[str, Any]]:
        """Get the default CV for the user."""
        conn = get_connection()
        cursor = conn.cursor()

        if user_id:
            cursor.execute("SELECT * FROM cvs WHERE is_default = 1 AND user_id = ? LIMIT 1", (user_id,))
        else:
            cursor.execute("SELECT * FROM cvs WHERE is_default = 1 LIMIT 1")
        row = cursor.fetchone()

        conn.close()

        if not row:
            return None

        return self._row_to_dict(row)

    def update_cv(self, cv_id: int, user_id: str = None, name: str = None, content: str = None) -> Optional[Dict[str, Any]]:
        """Update a CV's name or content. If user_id provided, verifies ownership."""
        conn = get_connection()
        cursor = conn.cursor()

        updates = ["updated_at = ?"]
        params = [datetime.now().isoformat()]

        if name is not None:
            updates.append("name = ?")
            params.append(name)

        if content is not None:
            updates.append("content = ?")
            params.append(content)

        params.append(cv_id)
        if user_id:
            params.append(user_id)
            query = f"UPDATE cvs SET {', '.join(updates)} WHERE id = ? AND user_id = ?"
        else:
            query = f"UPDATE cvs SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)

        conn.commit()
        conn.close()

        return self.get_cv(cv_id)

    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """Convert a database row to a dictionary."""
        return {
            "id": row["id"],
            "user_id": row["user_id"] or "default",
            "name": row["name"],
            "filename": row["filename"],
            "content": row["content"],
            "is_default": bool(row["is_default"]),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }
