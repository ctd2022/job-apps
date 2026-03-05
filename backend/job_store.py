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


# Database path - in data/ directory
DB_PATH = Path(__file__).parent.parent / "data" / "jobs.db"


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

    # Match history table - track ATS score iterations per job (Idea #121)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS match_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT NOT NULL,
            cv_version_id INTEGER,
            score REAL NOT NULL,
            matched INTEGER,
            total INTEGER,
            missing_count INTEGER,
            created_at TEXT NOT NULL,
            FOREIGN KEY (job_id) REFERENCES jobs(job_id)
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
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_match_history_job ON match_history(job_id, created_at)
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
        ("include_in_profile", "INTEGER DEFAULT 1"),  # Idea #242: Position profiling corpus
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

    # Migration: Add description column to job_history table
    try:
        cursor.execute("ALTER TABLE job_history ADD COLUMN description TEXT")
    except sqlite3.OperationalError:
        pass

    # Migration (Idea #281): Add issuing_org_id FK to certifications
    try:
        cursor.execute("ALTER TABLE certifications ADD COLUMN issuing_org_id INTEGER REFERENCES issuing_organisations(id)")
    except sqlite3.OperationalError:
        pass

    # Migration (Idea #281): Seed orgs from existing free-text issuing_org values
    cursor.execute("""
        INSERT OR IGNORE INTO issuing_organisations (name, colour, created_at, updated_at)
        SELECT DISTINCT issuing_org, '#6366f1', datetime('now'), datetime('now')
        FROM certifications WHERE issuing_org IS NOT NULL AND issuing_org != ''
    """)
    cursor.execute("""
        UPDATE certifications
        SET issuing_org_id = (
            SELECT id FROM issuing_organisations WHERE name = certifications.issuing_org
        )
        WHERE issuing_org_id IS NULL
    """)

    # Migration (Idea #281): Add cert_grouping_mode to candidate_profiles
    try:
        cursor.execute("ALTER TABLE candidate_profiles ADD COLUMN cert_grouping_mode TEXT DEFAULT 'flat'")
    except sqlite3.OperationalError:
        pass

    # Migration: Add user_id columns (for existing databases)
    for table in ["jobs", "cvs"]:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN user_id TEXT")
        except sqlite3.OperationalError:
            # Column already exists, ignore
            pass

    # Candidate profiles table (Idea #233)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS candidate_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'default',
            full_name TEXT, email TEXT, phone TEXT,
            location TEXT, linkedin TEXT, website TEXT, headline TEXT,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
            UNIQUE(user_id)
        )
    ''')

    # Job history table (Idea #233) — employer stays local, NEVER sent to LLM
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS job_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'default',
            employer TEXT NOT NULL,
            title TEXT NOT NULL,
            start_date TEXT,
            end_date TEXT,
            is_current INTEGER DEFAULT 0,
            description TEXT,
            details TEXT,
            display_order INTEGER DEFAULT 0,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        )
    ''')

    # Profile tags table (Idea #233)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS profile_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_history_id INTEGER NOT NULL,
            tag TEXT NOT NULL,
            FOREIGN KEY (job_history_id) REFERENCES job_history(id) ON DELETE CASCADE
        )
    ''')

    # Certifications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS certifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'default',
            name TEXT NOT NULL,
            issuing_org TEXT NOT NULL,
            date_obtained TEXT,
            no_expiry INTEGER DEFAULT 0,
            expiry_date TEXT,
            credential_id TEXT,
            credential_url TEXT,
            display_order INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    # Skills table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'default',
            name TEXT NOT NULL,
            category TEXT,
            display_order INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    # Issuing Organisations table (Idea #281)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS issuing_organisations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            display_label TEXT,
            colour TEXT DEFAULT '#6366f1',
            logo_url TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    # Professional Development table (Idea #243)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS professional_development (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL DEFAULT 'default',
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            provider TEXT,
            status TEXT NOT NULL DEFAULT 'In Progress',
            start_date TEXT,
            target_completion TEXT,
            completed_date TEXT,
            leads_to_credential INTEGER DEFAULT 0,
            credential_url TEXT,
            show_on_cv INTEGER DEFAULT 1,
            notes TEXT,
            display_order INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

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

    # Migration: Backfill match_history from existing jobs with ATS scores (Idea #121)
    cursor.execute("SELECT COUNT(*) FROM match_history")
    history_count = cursor.fetchone()[0]
    if history_count == 0:
        cursor.execute("""
            SELECT job_id, ats_score, cv_version_id, ats_details, created_at
            FROM jobs WHERE ats_score IS NOT NULL
        """)
        jobs_to_migrate = cursor.fetchall()
        for job_row in jobs_to_migrate:
            matched = None
            total = None
            missing_count = None
            if job_row["ats_details"]:
                try:
                    details = json.loads(job_row["ats_details"])
                    matched = details.get("matched")
                    total = details.get("total")
                    missing_count = len(details.get("missing_keywords", []))
                except (json.JSONDecodeError, TypeError):
                    pass
            cursor.execute('''
                INSERT INTO match_history (job_id, cv_version_id, score, matched, total, missing_count, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (job_row["job_id"], job_row["cv_version_id"], job_row["ats_score"],
                  matched, total, missing_count, job_row["created_at"]))
        if jobs_to_migrate:
            print(f"[OK] Backfilled match_history for {len(jobs_to_migrate)} existing jobs")

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

    def set_profile_include(self, job_id: str, include: bool, user_id: str = None) -> Dict[str, Any]:
        """Toggle a job's inclusion in the position profiling corpus (Idea #242)."""
        conn = get_connection()
        cursor = conn.cursor()

        if user_id:
            cursor.execute("SELECT job_id FROM jobs WHERE job_id = ? AND user_id = ?", (job_id, user_id))
        else:
            cursor.execute("SELECT job_id FROM jobs WHERE job_id = ?", (job_id,))

        if not cursor.fetchone():
            conn.close()
            raise KeyError(f"Job {job_id} not found")

        now = datetime.now().isoformat()
        cursor.execute(
            "UPDATE jobs SET include_in_profile = ?, updated_at = ? WHERE job_id = ?",
            (1 if include else 0, now, job_id),
        )
        conn.commit()
        conn.close()

        return self.get_job(job_id)

    def get_position_profile(self, user_id: str = None) -> Dict[str, Any]:
        """Aggregate ATS details from included jobs to build a position profile (Idea #242).

        Returns skill frequency, match rates, consistent gaps, strengths, and role distribution.
        All computed from stored ats_details JSON — no LLM required.
        """
        from collections import Counter

        conn = get_connection()
        cursor = conn.cursor()

        if user_id:
            cursor.execute(
                "SELECT job_id, company_name, job_title, ats_score, ats_details "
                "FROM jobs WHERE include_in_profile = 1 AND ats_details IS NOT NULL AND user_id = ?",
                (user_id,),
            )
        else:
            cursor.execute(
                "SELECT job_id, company_name, job_title, ats_score, ats_details "
                "FROM jobs WHERE include_in_profile = 1 AND ats_details IS NOT NULL"
            )
        rows = cursor.fetchall()
        conn.close()

        corpus_jobs = []
        skill_job_count: Counter = Counter()   # how many jobs required this skill
        skill_matched_count: Counter = Counter()  # how many jobs the CV matched it in
        job_titles: Counter = Counter()

        for row in rows:
            try:
                details = json.loads(row["ats_details"])
            except (json.JSONDecodeError, TypeError):
                continue

            corpus_jobs.append({
                "job_id": row["job_id"],
                "company_name": row["company_name"],
                "job_title": row["job_title"],
                "ats_score": row["ats_score"],
            })

            if row["job_title"]:
                job_titles[row["job_title"]] += 1

            # All skills/keywords required by this JD
            pe = details.get("parsed_entities", {})
            jd_skills: set = set()
            for s in pe.get("jd_required_skills", []):
                jd_skills.add(s.lower().strip())
            for s in pe.get("jd_preferred_skills", []):
                jd_skills.add(s.lower().strip())
            # Also include all keywords the ATS tested (matched + missing)
            matched_kws = {k.lower().strip() for k in details.get("matched_keywords", [])}
            missing_kws = {k.lower().strip() for k in details.get("missing_keywords", [])}
            all_jd_terms = jd_skills | matched_kws | missing_kws

            for skill in all_jd_terms:
                if skill:
                    skill_job_count[skill] += 1
            for skill in matched_kws:
                if skill in all_jd_terms:
                    skill_matched_count[skill] += 1

        total_jobs = len(corpus_jobs)
        if total_jobs == 0:
            return {
                "job_count": 0,
                "skill_frequency": [],
                "consistent_gaps": [],
                "strengths": [],
                "role_distribution": [],
                "corpus_jobs": [],
            }

        # Minimum appearances to include in results: at least 25% of jobs, floor of 2
        min_freq = max(2, round(total_jobs * 0.25)) if total_jobs >= 4 else 1

        skill_freq = []
        for skill, count in skill_job_count.most_common(40):
            if count < min_freq:
                continue
            matched_count = skill_matched_count.get(skill, 0)
            match_rate = matched_count / count
            skill_freq.append({
                "skill": skill,
                "frequency": count,
                "frequency_pct": round(count / total_jobs * 100),
                "matched_count": matched_count,
                "match_rate": round(match_rate, 2),
            })

        # Consistent gaps: appears in 40%+ of jobs, matched in fewer than half
        consistent_gaps = [
            s for s in skill_freq
            if s["match_rate"] < 0.5 and s["frequency_pct"] >= 40
        ]
        consistent_gaps.sort(key=lambda x: (x["match_rate"], -x["frequency"]))

        # Strengths: appears in 2+ jobs, matched in 70%+
        strengths = [
            s for s in skill_freq
            if s["match_rate"] >= 0.7 and s["frequency"] >= 2
        ]
        strengths.sort(key=lambda x: (-x["match_rate"], -x["frequency"]))

        role_distribution = [
            {"title": title, "count": count}
            for title, count in job_titles.most_common(10)
            if title
        ]

        return {
            "job_count": total_jobs,
            "skill_frequency": skill_freq[:20],
            "consistent_gaps": consistent_gaps[:10],
            "strengths": strengths[:10],
            "role_distribution": role_distribution,
            "corpus_jobs": corpus_jobs,
        }

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

    def get_pipeline_diagnosis(self, user_id: str = None) -> Dict[str, Any]:
        """Analyze the application funnel and provide a diagnosis."""
        metrics = self.get_outcome_metrics(user_id=user_id)
        
        funnel = metrics["funnel"]
        rates = metrics["rates"]
        
        submitted_count = funnel.get("submitted", 0)
        interview_count = funnel.get("interview", 0)
        offer_count = funnel.get("offer", 0)
        
        diagnosis = "Your pipeline looks healthy. Keep up the great work!"
        advice = "Continue applying to relevant roles and preparing for interviews."
        
        if submitted_count < 5:
            diagnosis = "You're just getting started."
            advice = "Focus on submitting more applications to build up your pipeline data."
        elif rates["interview_rate"] < 10 and submitted_count > 10:
            diagnosis = "Your application-to-interview rate is low."
            advice = "This could indicate that your CV isn't getting past the initial screen. Focus on improving your ATS score and tailoring your CV to each job."
        elif rates["interview_rate"] > 20 and rates["offer_rate"] < 10 and interview_count > 5:
            diagnosis = "You're getting interviews, but not as many offers as expected."
            advice = "This is a great sign that your CV is effective! Now, focus on honing your interview skills. Practice common interview questions and be prepared to talk about your experience in detail."
        elif submitted_count > 20 and interview_count == 0:
            diagnosis = "You've submitted a good number of applications but haven't landed an interview yet."
            advice = "It's time to take a close look at your CV and cover letter. Are they tailored to the jobs you're applying for? Are they optimized for ATS scanners? Consider getting feedback from a career coach or mentor."

        return {
            "diagnosis": diagnosis,
            "advice": advice,
            "metrics": {
                "total_submitted": submitted_count,
                "interview_rate": rates["interview_rate"],
                "offer_rate": rates["offer_rate"],
            },
        }

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

        try:
            include_in_profile = bool(row["include_in_profile"]) if row["include_in_profile"] is not None else True
        except (IndexError, KeyError):
            include_in_profile = True

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
            # Idea #242: Position profiling corpus inclusion flag
            "include_in_profile": include_in_profile,
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


class ProfileStore:
    """SQLite-backed store for candidate profile and job history (Idea #233)."""

    def __init__(self) -> None:
        init_db()

    def get_or_create_profile(self, user_id: str) -> Dict[str, Any]:
        """Return profile for user, creating a blank one if absent."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM candidate_profiles WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if row is None:
            now = datetime.now().isoformat()
            cursor.execute(
                "INSERT INTO candidate_profiles (user_id, created_at, updated_at) VALUES (?, ?, ?)",
                (user_id, now, now),
            )
            conn.commit()
            cursor.execute("SELECT * FROM candidate_profiles WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
        conn.close()
        return dict(row)

    def update_profile(self, user_id: str, fields: Dict[str, Any]) -> Dict[str, Any]:
        """Update personal info fields. Returns updated profile."""
        allowed = {"full_name", "email", "phone", "location", "linkedin", "website", "headline", "cert_grouping_mode"}
        url_fields = {"linkedin", "website"}
        updates = {
            k: (v.replace(" ", "") if k in url_fields and isinstance(v, str) else v)
            for k, v in fields.items() if k in allowed
        }
        if not updates:
            return self.get_or_create_profile(user_id)
        updates["updated_at"] = datetime.now().isoformat()
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [user_id]
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(f"UPDATE candidate_profiles SET {set_clause} WHERE user_id = ?", values)
        conn.commit()
        conn.close()
        return self.get_or_create_profile(user_id)

    def _row_to_job(self, row: sqlite3.Row, tags: List[str]) -> Dict[str, Any]:
        d = dict(row)
        d["is_current"] = bool(d.get("is_current"))
        d["tags"] = tags
        return d

    def list_job_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Return all job history records for user, ordered by display_order."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM job_history WHERE user_id = ? ORDER BY display_order ASC, id ASC",
            (user_id,),
        )
        rows = cursor.fetchall()
        result = []
        for row in rows:
            cursor.execute("SELECT tag FROM profile_tags WHERE job_history_id = ?", (row["id"],))
            tags = [r["tag"] for r in cursor.fetchall()]
            result.append(self._row_to_job(row, tags))
        conn.close()
        return result

    def create_job(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a new job history record. Returns the created record."""
        now = datetime.now().isoformat()
        tags = data.pop("tags", [])
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO job_history
               (user_id, employer, title, start_date, end_date, is_current, description, details, display_order, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                data.get("employer", ""),
                data.get("title", ""),
                data.get("start_date"),
                data.get("end_date"),
                1 if data.get("is_current") else 0,
                data.get("description"),
                data.get("details"),
                data.get("display_order", 0),
                now,
                now,
            ),
        )
        job_id = cursor.lastrowid
        for tag in tags:
            if tag.strip():
                cursor.execute(
                    "INSERT INTO profile_tags (job_history_id, tag) VALUES (?, ?)",
                    (job_id, tag.strip()),
                )
        conn.commit()
        cursor.execute("SELECT * FROM job_history WHERE id = ?", (job_id,))
        row = cursor.fetchone()
        cursor.execute("SELECT tag FROM profile_tags WHERE job_history_id = ?", (job_id,))
        stored_tags = [r["tag"] for r in cursor.fetchall()]
        conn.close()
        return self._row_to_job(row, stored_tags)

    def update_job(self, job_id: int, user_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a job history record. Returns updated record or None if not found."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM job_history WHERE id = ? AND user_id = ?", (job_id, user_id))
        if not cursor.fetchone():
            conn.close()
            return None
        allowed = {"employer", "title", "start_date", "end_date", "is_current", "description", "details", "display_order"}
        updates: Dict[str, Any] = {k: v for k, v in data.items() if k in allowed}
        if "is_current" in updates:
            updates["is_current"] = 1 if updates["is_current"] else 0
        tags = data.get("tags")
        updates["updated_at"] = datetime.now().isoformat()
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            values = list(updates.values()) + [job_id, user_id]
            cursor.execute(
                f"UPDATE job_history SET {set_clause} WHERE id = ? AND user_id = ?", values
            )
        if tags is not None:
            cursor.execute("DELETE FROM profile_tags WHERE job_history_id = ?", (job_id,))
            for tag in tags:
                if tag.strip():
                    cursor.execute(
                        "INSERT INTO profile_tags (job_history_id, tag) VALUES (?, ?)",
                        (job_id, tag.strip()),
                    )
        conn.commit()
        cursor.execute("SELECT * FROM job_history WHERE id = ?", (job_id,))
        row = cursor.fetchone()
        cursor.execute("SELECT tag FROM profile_tags WHERE job_history_id = ?", (job_id,))
        stored_tags = [r["tag"] for r in cursor.fetchall()]
        conn.close()
        return self._row_to_job(row, stored_tags)

    def delete_job(self, job_id: int, user_id: str) -> bool:
        """Delete a job history record. Returns True if deleted, False if not found."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM job_history WHERE id = ? AND user_id = ?", (job_id, user_id)
        )
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted

    def reorder_jobs(self, user_id: str, ordered_ids: List[int]) -> None:
        """Set display_order for each job in the given order."""
        conn = get_connection()
        cursor = conn.cursor()
        for idx, job_id in enumerate(ordered_ids):
            cursor.execute(
                "UPDATE job_history SET display_order = ? WHERE id = ? AND user_id = ?",
                (idx, job_id, user_id),
            )
        conn.commit()
        conn.close()

    def update_job_details(self, job_id: int, details: str, tags: List[str]) -> None:
        """Update only details and tags (used for save-back from CV text)."""
        now = datetime.now().isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE job_history SET details = ?, updated_at = ? WHERE id = ?",
            (details, now, job_id),
        )
        cursor.execute("DELETE FROM profile_tags WHERE job_history_id = ?", (job_id,))
        for tag in tags:
            if tag.strip():
                cursor.execute(
                    "INSERT INTO profile_tags (job_history_id, tag) VALUES (?, ?)",
                    (job_id, tag.strip()),
                )
        conn.commit()
        conn.close()

    # ── Certifications ──────────────────────────────────────────────────────

    def _row_to_cert(self, row: sqlite3.Row) -> Dict[str, Any]:
        d = dict(row)
        d["no_expiry"] = bool(d.get("no_expiry"))
        return d

    def list_certifications(self, user_id: str) -> List[Dict[str, Any]]:
        """Return all certifications for user, joined with org data, ordered by display_order."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """SELECT c.*, o.colour AS org_colour, o.display_label AS org_display_label
               FROM certifications c
               LEFT JOIN issuing_organisations o ON c.issuing_org_id = o.id
               WHERE c.user_id = ? ORDER BY c.display_order ASC, c.id ASC""",
            (user_id,),
        )
        rows = cursor.fetchall()
        conn.close()
        return [self._row_to_cert(r) for r in rows]

    def _resolve_issuing_org(self, cursor: sqlite3.Cursor, data: Dict[str, Any], now: str) -> tuple[Optional[int], str]:
        """Resolve issuing_org_id and derive issuing_org text. Returns (org_id, org_name)."""
        org_id = data.get("issuing_org_id")
        if org_id is not None:
            cursor.execute("SELECT name FROM issuing_organisations WHERE id = ?", (org_id,))
            row = cursor.fetchone()
            org_name = row["name"] if row else data.get("issuing_org", "")
        else:
            org_name = data.get("issuing_org", "")
            if org_name:
                cursor.execute(
                    "INSERT OR IGNORE INTO issuing_organisations (name, colour, created_at, updated_at) VALUES (?, '#6366f1', ?, ?)",
                    (org_name, now, now),
                )
                cursor.execute("SELECT id FROM issuing_organisations WHERE name = ?", (org_name,))
                row = cursor.fetchone()
                org_id = row["id"] if row else None
        return org_id, org_name

    def create_certification(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a new certification. Returns the created record."""
        now = datetime.now().isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        org_id, org_name = self._resolve_issuing_org(cursor, data, now)
        cursor.execute(
            """INSERT INTO certifications
               (user_id, name, issuing_org, issuing_org_id, date_obtained, no_expiry, expiry_date,
                credential_id, credential_url, display_order, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                data.get("name", ""),
                org_name,
                org_id,
                data.get("date_obtained"),
                1 if data.get("no_expiry") else 0,
                data.get("expiry_date"),
                data.get("credential_id"),
                data.get("credential_url"),
                data.get("display_order", 0),
                now,
                now,
            ),
        )
        cert_id = cursor.lastrowid
        conn.commit()
        cursor.execute(
            """SELECT c.*, o.colour AS org_colour, o.display_label AS org_display_label
               FROM certifications c LEFT JOIN issuing_organisations o ON c.issuing_org_id = o.id
               WHERE c.id = ?""",
            (cert_id,),
        )
        row = cursor.fetchone()
        conn.close()
        return self._row_to_cert(row)

    def update_certification(self, cert_id: int, user_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a certification record. Returns updated record or None."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM certifications WHERE id = ? AND user_id = ?", (cert_id, user_id))
        if not cursor.fetchone():
            conn.close()
            return None
        now = datetime.now().isoformat()
        allowed = {"name", "issuing_org", "issuing_org_id", "date_obtained", "no_expiry",
                   "expiry_date", "credential_id", "credential_url", "display_order"}
        updates: Dict[str, Any] = {k: v for k, v in data.items() if k in allowed}
        if "no_expiry" in updates:
            updates["no_expiry"] = 1 if updates["no_expiry"] else 0
        # If issuing_org_id or issuing_org changed, keep both in sync
        if "issuing_org_id" in updates or "issuing_org" in updates:
            org_id, org_name = self._resolve_issuing_org(cursor, data, now)
            updates["issuing_org_id"] = org_id
            updates["issuing_org"] = org_name
        updates["updated_at"] = now
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [cert_id, user_id]
        cursor.execute(
            f"UPDATE certifications SET {set_clause} WHERE id = ? AND user_id = ?", values
        )
        conn.commit()
        cursor.execute(
            """SELECT c.*, o.colour AS org_colour, o.display_label AS org_display_label
               FROM certifications c LEFT JOIN issuing_organisations o ON c.issuing_org_id = o.id
               WHERE c.id = ?""",
            (cert_id,),
        )
        row = cursor.fetchone()
        conn.close()
        return self._row_to_cert(row)

    def delete_certification(self, cert_id: int, user_id: str) -> bool:
        """Delete a certification. Returns True if deleted."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM certifications WHERE id = ? AND user_id = ?", (cert_id, user_id)
        )
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted

    def reorder_certifications(self, user_id: str, ordered_ids: List[int]) -> None:
        """Set display_order for each certification in the given order."""
        conn = get_connection()
        cursor = conn.cursor()
        for idx, cert_id in enumerate(ordered_ids):
            cursor.execute(
                "UPDATE certifications SET display_order = ? WHERE id = ? AND user_id = ?",
                (idx, cert_id, user_id),
            )
        conn.commit()
        conn.close()

    # ── Issuing Organisations (Idea #281) ────────────────────────────────────

    def list_orgs(self) -> List[Dict[str, Any]]:
        """Return all issuing organisations, ordered by name."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM issuing_organisations ORDER BY name ASC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def create_org(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a new issuing organisation. Returns the created record."""
        now = datetime.now().isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO issuing_organisations (name, display_label, colour, logo_url, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                data["name"].strip(),
                data.get("display_label"),
                data.get("colour", "#6366f1"),
                data.get("logo_url"),
                now,
                now,
            ),
        )
        org_id = cursor.lastrowid
        conn.commit()
        cursor.execute("SELECT * FROM issuing_organisations WHERE id = ?", (org_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row)

    def update_org(self, org_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an issuing organisation. Returns updated record or None."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM issuing_organisations WHERE id = ?", (org_id,))
        if not cursor.fetchone():
            conn.close()
            return None
        allowed = {"name", "display_label", "colour", "logo_url"}
        updates = {k: v for k, v in data.items() if k in allowed and v is not None}
        updates["updated_at"] = datetime.now().isoformat()
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [org_id]
        cursor.execute(f"UPDATE issuing_organisations SET {set_clause} WHERE id = ?", values)
        conn.commit()
        cursor.execute("SELECT * FROM issuing_organisations WHERE id = ?", (org_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row)

    def delete_org(self, org_id: int) -> bool:
        """Delete an org if no certifications reference it. Returns True if deleted."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM certifications WHERE issuing_org_id = ?", (org_id,))
        if cursor.fetchone()[0] > 0:
            conn.close()
            return False
        cursor.execute("DELETE FROM issuing_organisations WHERE id = ?", (org_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted

    # ── Professional Development ─────────────────────────────────────────────

    def _row_to_pd(self, row: sqlite3.Row) -> Dict[str, Any]:
        d = dict(row)
        d["leads_to_credential"] = bool(d.get("leads_to_credential"))
        d["show_on_cv"] = bool(d.get("show_on_cv"))
        return d

    def list_professional_development(self, user_id: str) -> List[Dict[str, Any]]:
        """Return all PD items for user, ordered by display_order."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM professional_development WHERE user_id = ? ORDER BY display_order ASC, id ASC",
            (user_id,),
        )
        rows = cursor.fetchall()
        conn.close()
        return [self._row_to_pd(r) for r in rows]

    def create_professional_development(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a new PD item. Returns the created record."""
        now = datetime.now().isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO professional_development
               (user_id, type, title, provider, status, start_date, target_completion,
                completed_date, leads_to_credential, credential_url, show_on_cv, notes,
                display_order, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                data.get("type", ""),
                data.get("title", ""),
                data.get("provider"),
                data.get("status", "In Progress"),
                data.get("start_date"),
                data.get("target_completion"),
                data.get("completed_date"),
                1 if data.get("leads_to_credential") else 0,
                data.get("credential_url"),
                1 if data.get("show_on_cv", True) else 0,
                data.get("notes"),
                data.get("display_order", 0),
                now,
                now,
            ),
        )
        pd_id = cursor.lastrowid
        conn.commit()
        cursor.execute("SELECT * FROM professional_development WHERE id = ?", (pd_id,))
        row = cursor.fetchone()
        conn.close()
        return self._row_to_pd(row)

    def update_professional_development(self, pd_id: int, user_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a PD item. Returns updated record or None."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM professional_development WHERE id = ? AND user_id = ?", (pd_id, user_id))
        if not cursor.fetchone():
            conn.close()
            return None
        allowed = {"type", "title", "provider", "status", "start_date", "target_completion",
                   "completed_date", "leads_to_credential", "credential_url", "show_on_cv",
                   "notes", "display_order"}
        updates: Dict[str, Any] = {k: v for k, v in data.items() if k in allowed}
        if "leads_to_credential" in updates:
            updates["leads_to_credential"] = 1 if updates["leads_to_credential"] else 0
        if "show_on_cv" in updates:
            updates["show_on_cv"] = 1 if updates["show_on_cv"] else 0
        updates["updated_at"] = datetime.now().isoformat()
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [pd_id, user_id]
        cursor.execute(
            f"UPDATE professional_development SET {set_clause} WHERE id = ? AND user_id = ?", values
        )
        conn.commit()
        cursor.execute("SELECT * FROM professional_development WHERE id = ?", (pd_id,))
        row = cursor.fetchone()
        conn.close()
        return self._row_to_pd(row)

    def delete_professional_development(self, pd_id: int, user_id: str) -> bool:
        """Delete a PD item. Returns True if deleted."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM professional_development WHERE id = ? AND user_id = ?", (pd_id, user_id)
        )
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted

    def reorder_professional_development(self, user_id: str, ordered_ids: List[int]) -> None:
        """Set display_order for each PD item in the given order."""
        conn = get_connection()
        cursor = conn.cursor()
        for idx, pd_id in enumerate(ordered_ids):
            cursor.execute(
                "UPDATE professional_development SET display_order = ? WHERE id = ? AND user_id = ?",
                (idx, pd_id, user_id),
            )
        conn.commit()
        conn.close()

    # ── Skills ──────────────────────────────────────────────────────────────

    def list_skills(self, user_id: str) -> List[Dict[str, Any]]:
        """Return all skills for user, ordered by category then display_order."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM skills WHERE user_id = ? ORDER BY category ASC, display_order ASC, id ASC",
            (user_id,),
        )
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def create_skill(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a new skill. Returns the created record."""
        now = datetime.now().isoformat()
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO skills (user_id, name, category, display_order, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                data.get("name", ""),
                data.get("category") or None,
                data.get("display_order", 0),
                now,
                now,
            ),
        )
        skill_id = cursor.lastrowid
        conn.commit()
        cursor.execute("SELECT * FROM skills WHERE id = ?", (skill_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row)

    def update_skill(self, skill_id: int, user_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a skill record. Returns updated record or None."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM skills WHERE id = ? AND user_id = ?", (skill_id, user_id))
        if not cursor.fetchone():
            conn.close()
            return None
        allowed = {"name", "category", "display_order"}
        updates: Dict[str, Any] = {k: v for k, v in data.items() if k in allowed}
        if "category" in updates and updates["category"] == "":
            updates["category"] = None
        updates["updated_at"] = datetime.now().isoformat()
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [skill_id, user_id]
        cursor.execute(
            f"UPDATE skills SET {set_clause} WHERE id = ? AND user_id = ?", values
        )
        conn.commit()
        cursor.execute("SELECT * FROM skills WHERE id = ?", (skill_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row)

    def delete_skill(self, skill_id: int, user_id: str) -> bool:
        """Delete a skill. Returns True if deleted."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM skills WHERE id = ? AND user_id = ?", (skill_id, user_id)
        )
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted


class MatchHistoryStore:
    """SQLite-backed store for ATS match history per job (Idea #121)."""

    def __init__(self) -> None:
        init_db()

    def add_entry(
        self,
        job_id: str,
        score: float,
        cv_version_id: Optional[int] = None,
        matched: Optional[int] = None,
        total: Optional[int] = None,
        missing_count: Optional[int] = None,
    ) -> int:
        """Insert a match history entry. Returns the new row ID."""
        conn = get_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        cursor.execute('''
            INSERT INTO match_history (job_id, cv_version_id, score, matched, total, missing_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (job_id, cv_version_id, score, matched, total, missing_count, now))
        row_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return row_id

    def get_history(self, job_id: str) -> List[Dict[str, Any]]:
        """Get all match history entries for a job, ordered by creation time."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT mh.id, mh.job_id, mh.cv_version_id, mh.score, mh.matched,
                   mh.total, mh.missing_count, mh.created_at,
                   cv.version_number, cv.change_summary
            FROM match_history mh
            LEFT JOIN cv_versions cv ON mh.cv_version_id = cv.id
            WHERE mh.job_id = ?
            ORDER BY mh.created_at ASC
        ''', (job_id,))
        rows = cursor.fetchall()
        conn.close()

        result: List[Dict[str, Any]] = []
        for i, row in enumerate(rows):
            entry: Dict[str, Any] = {
                "id": row["id"],
                "job_id": row["job_id"],
                "cv_version_id": row["cv_version_id"],
                "score": row["score"],
                "matched": row["matched"],
                "total": row["total"],
                "missing_count": row["missing_count"],
                "created_at": row["created_at"],
                "version_number": row["version_number"],
                "change_summary": row["change_summary"],
                "iteration": i + 1,
                "delta": round(row["score"] - rows[i - 1]["score"], 1) if i > 0 else None,
            }
            result.append(entry)
        return result
