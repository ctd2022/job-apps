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

    # CV versions table - track content snapshots (Track 2.9.3)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cv_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cv_id INTEGER NOT NULL,
            version_number INTEGER NOT NULL,
            filename TEXT NOT NULL,
            content TEXT NOT NULL,
            change_summary TEXT,
            created_at TEXT NOT NULL,
            UNIQUE(cv_id, version_number)
        )
    ''')

    # Create basic indexes
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_cvs_is_default ON cvs(is_default DESC)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_cv_versions_cv_id ON cv_versions(cv_id)
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
        ("ats_details", "TEXT"),  # Track 2.9.2: Full ATS analysis JSON
        ("cv_version_id", "INTEGER"),  # Track 2.9.3: Link to specific CV version used
    ]

    for col_name, col_type in outcome_columns:
        try:
            cursor.execute(f"ALTER TABLE jobs ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError:
            # Column already exists, ignore
            pass

    # Migration: Add current_version_id to cvs table (Track 2.9.3)
    try:
        cursor.execute("ALTER TABLE cvs ADD COLUMN current_version_id INTEGER")
    except sqlite3.OperationalError:
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

    # Migration: Populate cv_versions from existing cvs data (Track 2.9.3)
    # Only runs once: if cvs has rows with content but cv_versions is empty
    cursor.execute("SELECT COUNT(*) FROM cv_versions")
    versions_count = cursor.fetchone()[0]
    if versions_count == 0:
        cursor.execute("SELECT id, filename, content, created_at FROM cvs WHERE content IS NOT NULL AND content != ''")
        cvs_to_migrate = cursor.fetchall()
        if cvs_to_migrate:
            for cv_row in cvs_to_migrate:
                cursor.execute('''
                    INSERT INTO cv_versions (cv_id, version_number, filename, content, change_summary, created_at)
                    VALUES (?, 1, ?, ?, 'Initial version (migrated)', ?)
                ''', (cv_row["id"], cv_row["filename"], cv_row["content"], cv_row["created_at"]))
                version_id = cursor.lastrowid
                cursor.execute("UPDATE cvs SET current_version_id = ? WHERE id = ?", (version_id, cv_row["id"]))
            print(f"[OK] Migrated {len(cvs_to_migrate)} CVs to cv_versions table")

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
        # Handle columns which may not exist in older databases
        try:
            job_description_text = row["job_description_text"]
        except (IndexError, KeyError):
            job_description_text = None

        try:
            ats_details = row["ats_details"]
        except (IndexError, KeyError):
            ats_details = None

        try:
            cv_version_id = row["cv_version_id"]
        except (IndexError, KeyError):
            cv_version_id = None

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
            # Track 2.9.2: ATS analysis details
            "ats_details": ats_details,
            # Track 2.9.3: CV version used for this job
            "cv_version_id": cv_version_id,
        }


class CVStore:
    """SQLite-backed store for user CVs with version tracking."""

    def __init__(self):
        init_db()

    def create_cv(self, name: str, filename: str, content: str, user_id: str = "default", is_default: bool = False) -> Dict[str, Any]:
        """Create a new CV with its first version."""
        conn = get_connection()
        cursor = conn.cursor()

        now = datetime.now().isoformat()

        # If this is set as default, clear other defaults for this user first
        if is_default:
            cursor.execute("UPDATE cvs SET is_default = 0 WHERE user_id = ?", (user_id,))

        # Insert CV parent record (content/filename kept for backward compat)
        cursor.execute('''
            INSERT INTO cvs (name, filename, content, user_id, is_default, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (name, filename, content, user_id, 1 if is_default else 0, now, now))
        cv_id = cursor.lastrowid

        # Create version 1
        cursor.execute('''
            INSERT INTO cv_versions (cv_id, version_number, filename, content, change_summary, created_at)
            VALUES (?, 1, ?, ?, 'Initial version', ?)
        ''', (cv_id, filename, content, now))
        version_id = cursor.lastrowid

        # Link CV to its current version
        cursor.execute("UPDATE cvs SET current_version_id = ? WHERE id = ?", (version_id, cv_id))

        conn.commit()
        conn.close()

        return self.get_cv(cv_id)

    def get_cv(self, cv_id: int, user_id: str = None) -> Optional[Dict[str, Any]]:
        """Get CV by ID with current version content. If user_id provided, verifies ownership."""
        conn = get_connection()
        cursor = conn.cursor()

        if user_id:
            cursor.execute('''
                SELECT c.id, c.user_id, c.name, c.is_default, c.created_at, c.updated_at,
                       c.current_version_id,
                       v.filename, v.content, v.version_number
                FROM cvs c
                LEFT JOIN cv_versions v ON c.current_version_id = v.id
                WHERE c.id = ? AND c.user_id = ?
            ''', (cv_id, user_id))
        else:
            cursor.execute('''
                SELECT c.id, c.user_id, c.name, c.is_default, c.created_at, c.updated_at,
                       c.current_version_id,
                       v.filename, v.content, v.version_number
                FROM cvs c
                LEFT JOIN cv_versions v ON c.current_version_id = v.id
                WHERE c.id = ?
            ''', (cv_id,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return None

        # Get version count
        cursor.execute("SELECT COUNT(*) FROM cv_versions WHERE cv_id = ?", (cv_id,))
        version_count = cursor.fetchone()[0]

        conn.close()

        return self._row_to_dict(row, version_count=version_count)

    def get_cv_content(self, cv_id: int, user_id: str = None) -> Optional[str]:
        """Get the current version's content for processing. If user_id provided, verifies ownership."""
        conn = get_connection()
        cursor = conn.cursor()

        if user_id:
            cursor.execute('''
                SELECT v.content
                FROM cvs c
                JOIN cv_versions v ON c.current_version_id = v.id
                WHERE c.id = ? AND c.user_id = ?
            ''', (cv_id, user_id))
        else:
            cursor.execute('''
                SELECT v.content
                FROM cvs c
                JOIN cv_versions v ON c.current_version_id = v.id
                WHERE c.id = ?
            ''', (cv_id,))
        row = cursor.fetchone()

        if not row:
            # Fallback: read from legacy content column (pre-migration)
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
        """List CVs (without content) with current version info."""
        conn = get_connection()
        cursor = conn.cursor()

        if user_id:
            cursor.execute('''
                SELECT c.id, c.user_id, c.name, c.is_default, c.created_at, c.updated_at,
                       c.current_version_id,
                       COALESCE(v.filename, c.filename) as filename,
                       COALESCE(v.version_number, 1) as version_number
                FROM cvs c
                LEFT JOIN cv_versions v ON c.current_version_id = v.id
                WHERE c.user_id = ? ORDER BY c.is_default DESC, c.updated_at DESC
            ''', (user_id,))
        else:
            cursor.execute('''
                SELECT c.id, c.user_id, c.name, c.is_default, c.created_at, c.updated_at,
                       c.current_version_id,
                       COALESCE(v.filename, c.filename) as filename,
                       COALESCE(v.version_number, 1) as version_number
                FROM cvs c
                LEFT JOIN cv_versions v ON c.current_version_id = v.id
                ORDER BY c.is_default DESC, c.updated_at DESC
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
            "version_number": row["version_number"],
        } for row in rows]

    def delete_cv(self, cv_id: int, user_id: str = None) -> bool:
        """Delete a CV and all its versions. If user_id provided, verifies ownership."""
        conn = get_connection()
        cursor = conn.cursor()

        if user_id:
            cursor.execute("DELETE FROM cvs WHERE id = ? AND user_id = ?", (cv_id, user_id))
        else:
            cursor.execute("DELETE FROM cvs WHERE id = ?", (cv_id,))
        deleted = cursor.rowcount > 0

        if deleted:
            cursor.execute("DELETE FROM cv_versions WHERE cv_id = ?", (cv_id,))

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
            cursor.execute('''
                SELECT c.id, c.user_id, c.name, c.is_default, c.created_at, c.updated_at,
                       c.current_version_id,
                       COALESCE(v.filename, c.filename) as filename,
                       COALESCE(v.content, c.content) as content,
                       COALESCE(v.version_number, 1) as version_number
                FROM cvs c
                LEFT JOIN cv_versions v ON c.current_version_id = v.id
                WHERE c.is_default = 1 AND c.user_id = ? LIMIT 1
            ''', (user_id,))
        else:
            cursor.execute('''
                SELECT c.id, c.user_id, c.name, c.is_default, c.created_at, c.updated_at,
                       c.current_version_id,
                       COALESCE(v.filename, c.filename) as filename,
                       COALESCE(v.content, c.content) as content,
                       COALESCE(v.version_number, 1) as version_number
                FROM cvs c
                LEFT JOIN cv_versions v ON c.current_version_id = v.id
                WHERE c.is_default = 1 LIMIT 1
            ''')
        row = cursor.fetchone()

        conn.close()

        if not row:
            return None

        return self._row_to_dict(row)

    def update_cv(self, cv_id: int, user_id: str = None, name: str = None,
                  content: str = None, filename: str = None,
                  change_summary: str = None) -> Optional[Dict[str, Any]]:
        """Update a CV. Content changes create a new version; name-only changes don't."""
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()

        # Verify CV exists (and ownership)
        if user_id:
            cursor.execute("SELECT id, current_version_id FROM cvs WHERE id = ? AND user_id = ?", (cv_id, user_id))
        else:
            cursor.execute("SELECT id, current_version_id FROM cvs WHERE id = ?", (cv_id,))
        cv_row = cursor.fetchone()
        if not cv_row:
            conn.close()
            return None

        # Update name if provided
        if name is not None:
            cursor.execute("UPDATE cvs SET name = ?, updated_at = ? WHERE id = ?", (name, now, cv_id))

        # Content change: create a new version
        if content is not None:
            # Get current max version number
            cursor.execute("SELECT MAX(version_number) FROM cv_versions WHERE cv_id = ?", (cv_id,))
            max_version = cursor.fetchone()[0] or 0
            new_version = max_version + 1

            # Get filename from current version if not explicitly provided
            if filename is None:
                current_vid = cv_row["current_version_id"]
                if current_vid:
                    cursor.execute("SELECT filename FROM cv_versions WHERE id = ?", (current_vid,))
                    vrow = cursor.fetchone()
                    filename = vrow["filename"] if vrow else "cv.txt"
                else:
                    filename = "cv.txt"

            # Insert new version
            cursor.execute('''
                INSERT INTO cv_versions (cv_id, version_number, filename, content, change_summary, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (cv_id, new_version, filename, content, change_summary, now))
            version_id = cursor.lastrowid

            # Update current_version_id and legacy content column
            cursor.execute(
                "UPDATE cvs SET current_version_id = ?, content = ?, updated_at = ? WHERE id = ?",
                (version_id, content, now, cv_id)
            )

        conn.commit()
        conn.close()

        return self.get_cv(cv_id)

    # -- Version-specific methods --

    def list_cv_versions(self, cv_id: int, user_id: str = None) -> Optional[List[Dict[str, Any]]]:
        """List all versions of a CV (metadata only, no content)."""
        conn = get_connection()
        cursor = conn.cursor()

        # Verify CV exists and user has access
        if user_id:
            cursor.execute("SELECT id FROM cvs WHERE id = ? AND user_id = ?", (cv_id, user_id))
        else:
            cursor.execute("SELECT id FROM cvs WHERE id = ?", (cv_id,))
        if not cursor.fetchone():
            conn.close()
            return None

        cursor.execute('''
            SELECT id, cv_id, version_number, filename, change_summary, created_at
            FROM cv_versions WHERE cv_id = ?
            ORDER BY version_number DESC
        ''', (cv_id,))
        rows = cursor.fetchall()

        conn.close()

        return [{
            "id": row["id"],
            "cv_id": row["cv_id"],
            "version_number": row["version_number"],
            "filename": row["filename"],
            "change_summary": row["change_summary"],
            "created_at": row["created_at"],
        } for row in rows]

    def get_cv_version(self, version_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific CV version with full content."""
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT id, cv_id, version_number, filename, content, change_summary, created_at
            FROM cv_versions WHERE id = ?
        ''', (version_id,))
        row = cursor.fetchone()

        conn.close()

        if not row:
            return None

        return {
            "id": row["id"],
            "cv_id": row["cv_id"],
            "version_number": row["version_number"],
            "filename": row["filename"],
            "content": row["content"],
            "change_summary": row["change_summary"],
            "created_at": row["created_at"],
        }

    def get_cv_version_content(self, version_id: int) -> Optional[str]:
        """Get only the content of a specific CV version (for job processing)."""
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT content FROM cv_versions WHERE id = ?", (version_id,))
        row = cursor.fetchone()

        conn.close()

        if not row:
            return None

        return row["content"]

    def _row_to_dict(self, row: sqlite3.Row, version_count: int = None) -> Dict[str, Any]:
        """Convert a joined cvs+cv_versions row to a dictionary."""
        # Handle version_number - may come from JOIN or fallback to 1
        try:
            version_number = row["version_number"]
        except (IndexError, KeyError):
            version_number = 1

        try:
            current_version_id = row["current_version_id"]
        except (IndexError, KeyError):
            current_version_id = None

        result = {
            "id": row["id"],
            "user_id": row["user_id"] or "default",
            "name": row["name"],
            "filename": row["filename"],
            "content": row["content"],
            "is_default": bool(row["is_default"]),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "version_number": version_number,
            "current_version_id": current_version_id,
        }

        if version_count is not None:
            result["version_count"] = version_count

        return result
