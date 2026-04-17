#!/usr/bin/env python3
"""
FastAPI Backend for Job Application Workflow
Track 2: Local Web UI - Week 1

This provides a REST API for the existing job application workflow,
enabling a web-based interface while keeping everything local.
"""

import os
import re
import sys
import json
import uuid
import shutil
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List, Set
from enum import Enum

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env", override=True)

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ============================================================================
# Path Configuration - IMPORTANT for your project structure
# ============================================================================
# Your structure:
#   job_applications/
#   ├── backend/     <- we are here (main.py)
#   ├── src/         <- workflow modules are here
#   ├── scripts/
#   └── ...

# Get project root (parent of backend/)
PROJECT_ROOT = Path(__file__).parent.parent

# Add src/ directory to Python path for imports
SRC_DIR = PROJECT_ROOT / "src"
sys.path.insert(0, str(SRC_DIR))
sys.path.insert(0, str(PROJECT_ROOT))  # Also add root for any root-level modules

# Now import existing workflow modules
try:
    from job_application_workflow import JobApplicationWorkflow
    from llm_backend import LLMBackendFactory
    from ats_optimizer import ATSOptimizer
    WORKFLOW_AVAILABLE = True
    print(f"[OK] Successfully imported workflow modules from {SRC_DIR}")
except ImportError as e:
    WORKFLOW_AVAILABLE = False
    print(f"[WARN] Could not import workflow modules: {e}")
    print(f"   Looked in: {SRC_DIR}")
    print("   Some endpoints will not work until this is fixed.")


# ============================================================================
# Configuration
# ============================================================================

class Settings:
    """Application settings"""
    APP_NAME = "Job Application Workflow API"
    VERSION = "2.0.0"
    
    # Directories (relative to project root)
    BASE_DIR = PROJECT_ROOT
    INPUTS_DIR = BASE_DIR / "inputs"
    OUTPUTS_DIR = BASE_DIR / "outputs"
    UPLOADS_DIR = BASE_DIR / "uploads"  # Temporary upload storage
    SRC_DIR = SRC_DIR
    
    # Ensure directories exist
    INPUTS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    (INPUTS_DIR / "job_descriptions").mkdir(parents=True, exist_ok=True)


settings = Settings()


# ============================================================================
# Pydantic Models (Request/Response schemas)
# ============================================================================

class BackendType(str, Enum):
    ollama = "ollama"
    llamacpp = "llamacpp"
    gemini = "gemini"
    mistral = "mistral"


# Import from job_store module
# Handle both direct run and uvicorn import contexts
try:
    from job_store import JobStore, JobStatus, CVStore, OutcomeStatus, UserStore, MatchHistoryStore, ProfileStore
    import cv_assembler
    import pii_scrubber
except ImportError:
    from backend.job_store import JobStore, JobStatus, CVStore, OutcomeStatus, UserStore, MatchHistoryStore, ProfileStore
    from backend import cv_assembler, pii_scrubber


class BackendConfig(BaseModel):
    """Configuration for LLM backend"""
    backend_type: BackendType = BackendType.ollama
    model_name: Optional[str] = None
    # Ollama specific
    ollama_model: Optional[str] = "llama3.1:8b"
    # Llama.cpp specific
    llamacpp_url: Optional[str] = "http://localhost:8080"
    llamacpp_model: Optional[str] = "gemma-3-27B"
    # Gemini specific
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = "gemini-2.0-flash"
    # Mistral specific
    mistral_api_key: Optional[str] = None
    mistral_model: Optional[str] = "mistral-small-latest"


class JobRequest(BaseModel):
    """Request to process a job application"""
    company_name: Optional[str] = None
    enable_ats: bool = True
    backend_config: BackendConfig = BackendConfig()
    custom_questions: Optional[str] = None


class JobResponse(BaseModel):
    """Response for job processing"""
    job_id: str
    status: JobStatus
    message: str
    created_at: str


class JobStatusResponse(BaseModel):
    """Response for job status check"""
    job_id: str
    status: JobStatus
    progress: int  # 0-100
    current_step: Optional[str] = None
    message: Optional[str] = None
    output_dir: Optional[str] = None
    ats_score: Optional[float] = None
    files: Optional[List[str]] = None
    error: Optional[str] = None
    cv_version_id: Optional[int] = None
    backend_type: Optional[str] = None
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    backends_available: Dict[str, bool]
    workflow_available: bool


class BackendListResponse(BaseModel):
    """List of available backends"""
    backends: List[Dict[str, Any]]


class OutputFile(BaseModel):
    """Output file metadata"""
    filename: str
    path: str
    size: int
    type: str  # cv, cover_letter, ats_report, answers, metadata


class ApplicationSummary(BaseModel):
    """Summary of a processed application"""
    job_id: str
    job_name: str
    company_name: Optional[str]
    job_title: Optional[str]
    backend: str
    timestamp: str
    ats_score: Optional[float]
    status: JobStatus
    output_dir: str


class OutcomeUpdateRequest(BaseModel):
    """Request to update job application outcome"""
    outcome_status: str  # draft, submitted, response, interview, offer, rejected, withdrawn
    notes: Optional[str] = None


class JobMetadataRequest(BaseModel):
    """Request to update optional job metadata."""
    employment_type: Optional[str] = None
    salary: Optional[str] = None
    listing_url: Optional[str] = None


class SavedJobCreate(BaseModel):
    """Request to create a wishlist (Saved) job — no workflow triggered."""
    job_title: str
    company_name: str
    listing_url: Optional[str] = None
    job_description_text: Optional[str] = None
    salary: Optional[str] = None
    employment_type: Optional[str] = None


class CVContentUpdateRequest(BaseModel):
    """Request to update CV content (creates new version)"""
    content: str
    change_summary: Optional[str] = None


class RematchRequest(BaseModel):
    """Request to re-run ATS analysis with a different CV version."""
    cv_version_id: int


class ApplySuggestionsRequest(BaseModel):
    """Request to incorporate missing keywords into CV via LLM."""
    cv_version_id: int
    selected_keywords: List[str]
    weak_skills: Optional[List[str]] = None
    backend_type: Optional[str] = None
    model_name: Optional[str] = None


class GapFillAnswer(BaseModel):
    skill: str
    gap_type: str
    user_content: str


class GapFillRequest(BaseModel):
    cv_version_id: int
    answers: List[GapFillAnswer]
    backend_type: Optional[str] = None
    model_name: Optional[str] = None


class MetricsResponse(BaseModel):
    """Application funnel metrics"""
    total: int
    by_status: Dict[str, int]
    funnel: Dict[str, int]
    rates: Dict[str, float]
    avg_time_to_response_days: Optional[float]


class PipelineDiagnosisResponse(BaseModel):
    """Response for pipeline health diagnosis"""
    diagnosis: str
    advice: str
    metrics: Dict[str, Any]


class CVCoachAssessRequest(BaseModel):
    cv_text: str


class GenerateSummaryRequest(BaseModel):
    cv_text: str = ""  # Fallback if profile has no content
    job_description: Optional[str] = None
    backend_type: Optional[str] = None
    model_name: Optional[str] = None


# Idea #233: Candidate Profile models
class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None
    headline: Optional[str] = None
    cert_grouping_mode: Optional[str] = None
    summary: Optional[str] = None
    section_config: Optional[str] = None


class JobHistoryCreate(BaseModel):
    employer: str
    title: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    description: Optional[str] = None
    details: Optional[str] = None
    display_order: int = 0
    tags: List[str] = []


class JobHistoryUpdate(BaseModel):
    employer: Optional[str] = None
    title: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: Optional[bool] = None
    description: Optional[str] = None
    details: Optional[str] = None
    display_order: Optional[int] = None
    tags: Optional[List[str]] = None


class IssuingOrgCreate(BaseModel):
    name: str
    display_label: Optional[str] = None
    colour: str = '#6366f1'
    logo_url: Optional[str] = None


class IssuingOrgUpdate(BaseModel):
    name: Optional[str] = None
    display_label: Optional[str] = None
    colour: Optional[str] = None
    logo_url: Optional[str] = None


class CertificationCreate(BaseModel):
    name: str
    issuing_org: str = ''
    issuing_org_id: Optional[int] = None
    date_obtained: Optional[str] = None
    no_expiry: bool = False
    expiry_date: Optional[str] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None
    display_order: int = 0


class CertificationUpdate(BaseModel):
    name: Optional[str] = None
    issuing_org: Optional[str] = None
    issuing_org_id: Optional[int] = None
    date_obtained: Optional[str] = None
    no_expiry: Optional[bool] = None
    expiry_date: Optional[str] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None
    display_order: Optional[int] = None


class SkillCreate(BaseModel):
    name: str
    category: Optional[str] = None
    display_order: int = 0


class SkillUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    display_order: Optional[int] = None


class ProfessionalDevelopmentCreate(BaseModel):
    type: str
    title: str
    provider: Optional[str] = None
    status: str = "In Progress"
    start_date: Optional[str] = None
    target_completion: Optional[str] = None
    completed_date: Optional[str] = None
    leads_to_credential: bool = False
    credential_url: Optional[str] = None
    show_on_cv: bool = True
    notes: Optional[str] = None
    display_order: int = 0


class ProfessionalDevelopmentUpdate(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    provider: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    target_completion: Optional[str] = None
    completed_date: Optional[str] = None
    leads_to_credential: Optional[bool] = None
    credential_url: Optional[str] = None
    show_on_cv: Optional[bool] = None
    notes: Optional[str] = None
    display_order: Optional[int] = None


class EducationCreate(BaseModel):
    institution: str
    qualification: str
    grade: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    display_order: int = 0


class EducationUpdate(BaseModel):
    institution: Optional[str] = None
    qualification: Optional[str] = None
    grade: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: Optional[bool] = None
    display_order: Optional[int] = None


class ReorderRequest(BaseModel):
    ordered_ids: List[int]


class SyncFromCVRequest(BaseModel):
    cv_text: str
    sync_summary: bool = False


class ProfileIncludeRequest(BaseModel):
    include: bool


class UserCreateRequest(BaseModel):
    """Request to create a new user"""
    name: str


class UserResponse(BaseModel):
    """User response"""
    id: str
    name: str
    created_at: str


# ============================================================================
# User ID Header Dependency
# ============================================================================

def get_current_user_id(x_user_id: Optional[str] = Header(None)) -> str:
    """
    Extract user ID from X-User-ID header.
    Falls back to 'default' if not provided (backwards compatibility).
    """
    return x_user_id or "default"


# ============================================================================
# SQLite Stores (persistent across restarts)
# ============================================================================

# Global store instances (SQLite-backed)
job_store = JobStore()
cv_store = CVStore()
user_store = UserStore()
match_history_store = MatchHistoryStore()
profile_store = ProfileStore()


# ============================================================================
# WebSocket Connection Manager
# ============================================================================

class ConnectionManager:
    """Manages WebSocket connections for real-time job progress updates"""

    def __init__(self):
        # Map of job_id -> list of WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, job_id: str):
        """Accept a new WebSocket connection for a job"""
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = []
        self.active_connections[job_id].append(websocket)
        print(f"WebSocket connected for job {job_id}. Total connections: {len(self.active_connections[job_id])}")

    def disconnect(self, websocket: WebSocket, job_id: str):
        """Remove a WebSocket connection"""
        if job_id in self.active_connections:
            if websocket in self.active_connections[job_id]:
                self.active_connections[job_id].remove(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]
        print(f"WebSocket disconnected for job {job_id}")

    async def broadcast_job_update(self, job_id: str, data: Dict[str, Any]):
        """Send job update to all connected clients for this job"""
        if job_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[job_id]:
                try:
                    await connection.send_json(data)
                except Exception as e:
                    print(f"Error sending to WebSocket: {e}")
                    disconnected.append(connection)

            # Clean up disconnected clients
            for conn in disconnected:
                self.disconnect(conn, job_id)


# Global connection manager instance
ws_manager = ConnectionManager()


# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Local API for job application CV and cover letter generation with ATS optimization",
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Background Task: Process Job Application
# ============================================================================

async def update_job_and_broadcast(job_id: str, **kwargs):
    """Helper to update job status and broadcast via WebSocket"""
    job = job_store.update_job(job_id, **kwargs)
    await ws_manager.broadcast_job_update(job_id, job)
    return job


def _build_backend_config(backend_type: str, model_name: Optional[str] = None) -> Dict[str, Any]:
    """Build kwargs dict for LLMBackendFactory.create_backend() given a backend type."""
    if backend_type == "ollama":
        return {"model_name": model_name or "llama3.1:8b"}
    elif backend_type == "llamacpp":
        return {"model_name": model_name or "gemma-3-27B", "base_url": "http://localhost:8080"}
    elif backend_type == "gemini":
        return {"model_name": model_name or "gemini-2.0-flash", "api_key": os.environ.get("GEMINI_API_KEY")}
    elif backend_type == "mistral":
        return {"model_name": model_name or "mistral-small-latest", "api_key": os.environ.get("MISTRAL_API_KEY")}
    return {}


def _default_cloud_backend() -> str:
    """Return the best available cloud backend based on configured API keys."""
    if os.environ.get("GEMINI_API_KEY"):
        return "gemini"
    if os.environ.get("MISTRAL_API_KEY"):
        return "mistral"
    return "gemini"  # Will fail at runtime if no key is set


async def process_job_application(
    job_id: str,
    cv_path: str,
    job_desc_path: str,
    company_name: Optional[str],
    enable_ats: bool,
    backend_type: str,
    backend_config: dict,
    custom_questions: Optional[str] = None,
    user_id: str = "default",
):
    """
    Background task to process a job application.
    Updates job_store with progress and broadcasts via WebSocket.
    """
    
    # Check if workflow is available
    if not WORKFLOW_AVAILABLE:
        await update_job_and_broadcast(
            job_id,
            status=JobStatus.failed,
            progress=0,
            current_step="Failed",
            message="Workflow modules not available. Check server logs.",
            error="JobApplicationWorkflow module not imported. Check src/ folder."
        )
        return
    
    try:
        # Update status: Starting
        await update_job_and_broadcast(
            job_id,
            status=JobStatus.processing,
            progress=5,
            current_step="Initializing workflow",
            message="Setting up LLM backend..."
        )
        
        # Small delay to allow status update to propagate
        await asyncio.sleep(0.1)
        
        # Initialize workflow
        workflow = JobApplicationWorkflow(
            backend_type=backend_type,
            backend_config=backend_config,
            enable_ats=enable_ats
        )
        
        await update_job_and_broadcast(
            job_id,
            progress=10,
            current_step="Reading input files",
            message="Loading CV and job description..."
        )
        await asyncio.sleep(0.1)
        
        # Read inputs
        base_cv = workflow.read_cv(cv_path)
        job_description = workflow.read_text_file(job_desc_path)

        # PII scrubbing — strip employer names and personal info before LLM calls
        _pii_profile = profile_store.get_or_create_profile(user_id)
        _pii_job_history = profile_store.list_job_history(user_id)
        _scrub = pii_scrubber.scrub(base_cv, _pii_profile, _pii_job_history)
        scrubbed_cv = _scrub.scrubbed_text

        await update_job_and_broadcast(
            job_id,
            progress=15,
            current_step="Analyzing job description",
            message="Extracting key requirements..."
        )
        await asyncio.sleep(0.1)
        
        # ATS Analysis (if enabled)
        ats_report = None
        key_requirements = None
        ats_score = None
        
        if enable_ats:
            # ATSOptimizer imported at module level to ensure correct path
            ats_optimizer = ATSOptimizer(
                backend=workflow.backend,
                company_name=company_name
            )
            
            await update_job_and_broadcast(
                job_id,
                progress=25,
                current_step="Running ATS analysis",
                message="Calculating keyword match score..."
            )
            await asyncio.sleep(0.1)
            
            ats_report, key_requirements, ats_score = ats_optimizer.generate_ats_report(
                base_cv, job_description
            )

            # Track 2.9.2: Store full ATS analysis details
            ats_details_json = json.dumps(ats_score) if ats_score else None

            await update_job_and_broadcast(
                job_id,
                progress=40,
                current_step="Generating ATS-optimized CV",
                message=f"ATS Score: {ats_score['score']}% - Generating optimized CV...",
                ats_score=ats_score['score'],
                ats_details=ats_details_json
            )

            # Record initial match history entry (Idea #121)
            job_data = job_store.get_job(job_id)
            match_history_store.add_entry(
                job_id=job_id,
                score=ats_score['score'],
                cv_version_id=job_data.get("cv_version_id") if job_data else None,
                matched=ats_score.get('matched'),
                total=ats_score.get('total'),
                missing_count=len(ats_score.get('missing_keywords', [])),
            )

            await asyncio.sleep(0.1)

            raw_tailored = ats_optimizer.generate_ats_optimized_cv(
                scrubbed_cv, job_description, key_requirements
            )
            tailored_cv = pii_scrubber.restore(raw_tailored, _scrub.replacements)
        else:
            await update_job_and_broadcast(
                job_id,
                progress=40,
                current_step="Generating tailored CV",
                message="Creating customized CV..."
            )
            await asyncio.sleep(0.1)

            raw_tailored = workflow.tailor_cv(scrubbed_cv, job_description)
            tailored_cv = pii_scrubber.restore(raw_tailored, _scrub.replacements)

        await update_job_and_broadcast(
            job_id,
            progress=60,
            current_step="Generating cover letter",
            message="Writing personalized cover letter..."
        )
        await asyncio.sleep(0.1)

        raw_cover = workflow.generate_cover_letter(
            scrubbed_cv, job_description, company_name or "the company"
        )
        cover_letter = pii_scrubber.restore(raw_cover, _scrub.replacements)

        # Answer custom questions if provided
        answers = None
        if custom_questions:
            await update_job_and_broadcast(
                job_id,
                progress=75,
                current_step="Answering application questions",
                message="Generating responses to questions..."
            )
            await asyncio.sleep(0.1)

            raw_answers = workflow.answer_application_questions(
                scrubbed_cv, job_description, custom_questions
            )
            answers = pii_scrubber.restore(raw_answers, _scrub.replacements)
        
        await update_job_and_broadcast(
            job_id,
            progress=85,
            current_step="Saving outputs",
            message="Writing files to disk..."
        )
        await asyncio.sleep(0.1)
        
        # Save outputs
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        job_name = Path(job_desc_path).stem
        backend_label = backend_type.upper()
        output_dir = settings.OUTPUTS_DIR / f"{job_name}_{backend_label}_{timestamp}"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        files = []
        
        # Save CV
        cv_filename = f"tailored_cv_{backend_label.lower()}.md"
        cv_path_out = output_dir / cv_filename
        with open(cv_path_out, 'w', encoding='utf-8') as f:
            f.write(tailored_cv)
        files.append(cv_filename)
        
        # Save cover letter
        letter_filename = f"cover_letter_{backend_label.lower()}.txt"
        letter_path = output_dir / letter_filename
        with open(letter_path, 'w', encoding='utf-8') as f:
            f.write(cover_letter)
        files.append(letter_filename)
        
        # Save ATS report
        if ats_report:
            ats_filename = f"ats_analysis_{backend_label.lower()}.txt"
            ats_path = output_dir / ats_filename
            with open(ats_path, 'w', encoding='utf-8') as f:
                f.write(ats_report)
            files.append(ats_filename)
        
        # Save answers
        if answers:
            answers_filename = f"application_answers_{backend_label.lower()}.txt"
            answers_path = output_dir / answers_filename
            with open(answers_path, 'w', encoding='utf-8') as f:
                f.write(answers)
            files.append(answers_filename)
        
        # Save metadata
        metadata = {
            "job_id": job_id,
            "job_description": str(job_desc_path),
            "company_name": company_name,
            "timestamp": timestamp,
            "backend": {
                "type": backend_type,
                "config": backend_config
            },
            "ats_optimized": enable_ats,
            "ats_score": ats_score['score'] if ats_score else None
        }
        metadata_path = output_dir / "metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        files.append("metadata.json")
        
        # Try to generate DOCX files (optional - requires docx_templates)
        try:
            await update_job_and_broadcast(
                job_id,
                progress=92,
                current_step="Generating DOCX files",
                message="Creating professional Word documents..."
            )
            await asyncio.sleep(0.1)
            
            from docx_templates import generate_cv_docx_node, generate_cover_letter_docx_node
            
            # Generate CV DOCX
            cv_docx_path = str(output_dir / f"tailored_cv_{backend_label.lower()}.docx")
            generate_cv_docx_node(tailored_cv, cv_docx_path)
            files.append(f"tailored_cv_{backend_label.lower()}.docx")
            
            # Generate Cover Letter DOCX
            # Extract name from CV for signature
            applicant_name = "Applicant"
            lines = tailored_cv.split('\n')
            for line in lines[:5]:
                if line.startswith('# '):
                    applicant_name = line.replace('# ', '').strip()
                    break
            
            cl_docx_path = str(output_dir / f"cover_letter_{backend_label.lower()}.docx")
            generate_cover_letter_docx_node(cover_letter, cl_docx_path, applicant_name)
            files.append(f"cover_letter_{backend_label.lower()}.docx")
            
        except ImportError:
            # docx_templates not available, skip DOCX generation
            print("Note: docx_templates not available, skipping DOCX generation")
        except Exception as e:
            # DOCX generation failed, but continue
            print(f"Warning: DOCX generation failed: {e}")
        
        # Mark as complete
        await update_job_and_broadcast(
            job_id,
            status=JobStatus.completed,
            progress=100,
            current_step="Complete",
            message="Job application materials generated successfully!",
            output_dir=str(output_dir),
            files=files
        )
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error processing job {job_id}: {error_details}")

        # Mark as failed
        await update_job_and_broadcast(
            job_id,
            status=JobStatus.failed,
            progress=0,
            current_step="Failed",
            message=str(e),
            error=str(e)
        )


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint - health check"""
    # Check which backends are available
    backends_available = {
        "ollama": False,
        "llamacpp": False,
        "gemini": False,
        "mistral": False,
    }

    # Check Ollama
    try:
        import ollama
        ollama.list()
        backends_available["ollama"] = True
    except:
        pass

    # Check Llama.cpp (just check if requests works)
    backends_available["llamacpp"] = True  # Assume available, will fail at runtime if not

    # Check Gemini (check for API key)
    if os.environ.get("GEMINI_API_KEY"):
        backends_available["gemini"] = True

    # Check Mistral (check for API key)
    if os.environ.get("MISTRAL_API_KEY"):
        backends_available["mistral"] = True
    
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        backends_available=backends_available,
        workflow_available=WORKFLOW_AVAILABLE
    )


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "workflow_available": WORKFLOW_AVAILABLE,
        "src_dir": str(settings.SRC_DIR),
        "src_exists": settings.SRC_DIR.exists()
    }


# ============================================================================
# User Management Endpoints
# ============================================================================

@app.get("/api/users")
async def list_users():
    """List all users."""
    users = user_store.list_users()
    return {"users": users, "total": len(users)}


@app.post("/api/users", response_model=UserResponse)
async def create_user(request: UserCreateRequest):
    """Create a new user."""
    user = user_store.create_user(request.name)
    return UserResponse(**user)


@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    """Get a user by ID."""
    user = user_store.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    return UserResponse(**user)


class UserRenameRequest(BaseModel):
    name: str


@app.patch("/api/users/{user_id}", response_model=UserResponse)
async def rename_user(user_id: str, request: UserRenameRequest):
    """Rename a user (updates the dropdown display name)."""
    if not request.name.strip():
        raise HTTPException(status_code=422, detail="Name cannot be empty")
    user = user_store.rename_user(user_id, request.name)
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    return UserResponse(**user)


@app.get("/api/backends", response_model=BackendListResponse)
async def list_backends():
    """List available LLM backends and their configuration options"""
    backends = [
        {
            "id": "ollama",
            "name": "Ollama (Local)",
            "description": "Run models locally with Ollama",
            "available": True,
            "default_model": "llama3.1:8b",
            "models": ["llama3.2:3b", "llama3.1:8b", "qwen2.5:32b"],
            "config_fields": ["ollama_model"]
        },
        {
            "id": "llamacpp",
            "name": "Llama.cpp Server",
            "description": "Use llama.cpp server for custom GGUF models",
            "available": True,
            "default_model": "gemma-3-27B",
            "config_fields": ["llamacpp_url", "llamacpp_model"]
        },
        {
            "id": "gemini",
            "name": "Google Gemini",
            "description": "Use Google's Gemini API (requires API key)",
            "available": bool(os.environ.get("GEMINI_API_KEY")),
            "default_model": "gemini-2.0-flash",
            "models": ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
            "config_fields": ["gemini_api_key", "gemini_model"]
        },
        {
            "id": "mistral",
            "name": "Mistral AI",
            "description": "Use Mistral's API (requires API key)",
            "available": bool(os.environ.get("MISTRAL_API_KEY")),
            "default_model": "mistral-small-latest",
            "models": ["mistral-small-latest", "mistral-medium-latest", "mistral-large-latest"],
            "config_fields": ["mistral_api_key", "mistral_model"]
        }
    ]
    return BackendListResponse(backends=backends)


@app.post("/api/jobs", response_model=JobResponse)
async def create_job(
    background_tasks: BackgroundTasks,
    cv_file: Optional[UploadFile] = File(None),
    job_desc_file: UploadFile = File(...),
    cv_id: Optional[int] = Form(None),
    use_profile: bool = Form(False),
    company_name: Optional[str] = Form(None),
    job_title: Optional[str] = Form(None),
    enable_ats: bool = Form(True),
    backend_type: str = Form("ollama"),
    backend_model: Optional[str] = Form(None),
    custom_questions: Optional[str] = Form(None),
    user_id: str = Header(None, alias="X-User-ID"),
):
    """
    Create a new job application processing task.

    Provide CV either by uploading cv_file, specifying cv_id (stored CV),
    or setting use_profile=true to assemble CV from the candidate profile.
    Upload job description file, configure backend, and start processing.
    """
    # Default to 'default' user if not specified
    user_id = user_id or "default"

    # Check if workflow is available
    if not WORKFLOW_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Workflow modules not available. Check server logs and ensure src/ folder contains the required modules."
        )

    # Must provide one CV source
    if not cv_file and not cv_id and not use_profile:
        raise HTTPException(
            status_code=400,
            detail="Must provide either cv_file (upload), cv_id (stored CV), or use_profile=true"
        )

    # Generate unique job ID
    job_id = str(uuid.uuid4())[:8]

    # Create job in store with user_id
    job_store.create_job(job_id, user_id=user_id)

    try:
        cv_version_id = None  # Track which CV version is used (stored CVs only)

        # Handle CV - upload, stored CV, or assembled from profile
        if cv_file:
            # Use uploaded file
            cv_path = settings.UPLOADS_DIR / f"{job_id}_cv{Path(cv_file.filename).suffix}"
            with open(cv_path, "wb") as f:
                content = await cv_file.read()
                f.write(content)
        elif cv_id:
            # Use stored CV (verify user ownership)
            cv_data = cv_store.get_cv(cv_id, user_id=user_id)
            if not cv_data:
                raise HTTPException(status_code=404, detail=f"CV {cv_id} not found")
            cv_content = cv_data.get("content", "")
            cv_version_id = cv_data.get("current_version_id")
            cv_path = settings.UPLOADS_DIR / f"{job_id}_cv.txt"
            with open(cv_path, "w", encoding="utf-8") as f:
                f.write(cv_content)
        else:
            # Assemble CV from candidate profile
            profile = profile_store.get_or_create_profile(user_id)
            job_history = profile_store.list_job_history(user_id)
            certifications = profile_store.list_certifications(user_id)
            skills = profile_store.list_skills(user_id)
            pd_items = profile_store.list_professional_development(user_id)
            education = profile_store.list_education(user_id)
            orgs = profile_store.list_orgs()
            grouping_mode = profile.get("cert_grouping_mode") or "flat"
            contact_header = cv_assembler.format_contact_header(profile)
            summary_text = cv_assembler.assemble_summary_section(profile)
            experience_text = cv_assembler.assemble_experience_section(job_history)
            education_text = cv_assembler.assemble_education_section(education)
            certifications_text = cv_assembler.assemble_certifications_section(certifications, orgs, grouping_mode)
            skills_text = cv_assembler.assemble_skills_section(skills)
            pd_text = cv_assembler.assemble_professional_development_section(pd_items)
            cv_content = "\n\n".join(filter(None, [
                contact_header, summary_text, experience_text,
                education_text, certifications_text, skills_text, pd_text,
            ]))
            if not cv_content.strip():
                raise HTTPException(
                    status_code=400,
                    detail="Profile has no content. Please build your profile before using it as a CV source."
                )
            cv_path = settings.UPLOADS_DIR / f"{job_id}_cv.txt"
            with open(cv_path, "w", encoding="utf-8") as f:
                f.write(cv_content)
            # Save as a stored CV version so cv_version_id is set and job
            # detail features (CV editor, rematch, gap-fill) work correctly
            from datetime import date as _date
            cv_label_parts = ["Profile"]
            if job_title:
                cv_label_parts.append(job_title)
            if company_name:
                cv_label_parts.append(company_name)
            cv_label_parts.append(_date.today().strftime("%d %b %Y"))
            cv_name = " — ".join(cv_label_parts)
            saved_cv = cv_store.create_cv(
                name=cv_name,
                filename=f"{job_id}_cv.txt",
                content=cv_content,
                user_id=user_id,
                is_default=False,
            )
            cv_version_id = saved_cv.get("current_version_id")

        # Save job description file and extract text
        job_desc_path = settings.UPLOADS_DIR / f"{job_id}_job{Path(job_desc_file.filename).suffix}"
        job_desc_content = await job_desc_file.read()
        with open(job_desc_path, "wb") as f:
            f.write(job_desc_content)

        # Decode JD text for storage (try utf-8, fallback to latin-1)
        try:
            job_description_text = job_desc_content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                job_description_text = job_desc_content.decode("latin-1")
            except Exception:
                job_description_text = None

        # Build backend config
        backend_config = _build_backend_config(backend_type, backend_model)
        
        # Update job with file paths, JD text, and CV version link
        update_kwargs: dict = dict(
            cv_path=str(cv_path),
            job_desc_path=str(job_desc_path),
            company_name=company_name,
            job_title=job_title,
            backend_type=backend_type,
            job_description_text=job_description_text,
        )
        # Track which CV version was used (stored CV or profile-assembled)
        if cv_version_id:
            update_kwargs["cv_version_id"] = cv_version_id
        job_store.update_job(job_id, **update_kwargs)
        
        # Add background task
        background_tasks.add_task(
            process_job_application,
            job_id=job_id,
            cv_path=str(cv_path),
            job_desc_path=str(job_desc_path),
            company_name=company_name,
            enable_ats=enable_ats,
            backend_type=backend_type,
            backend_config=backend_config,
            custom_questions=custom_questions,
            user_id=user_id,
        )
        
        return JobResponse(
            job_id=job_id,
            status=JobStatus.pending,
            message="Job created and queued for processing",
            created_at=datetime.now().isoformat()
        )
        
    except Exception as e:
        job_store.update_job(
            job_id,
            status=JobStatus.failed,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail=str(e))


# ── Saved Jobs (Wishlist) — must be defined BEFORE /api/jobs/{job_id} ─────────

@app.post("/api/jobs/saved")
async def create_saved_job(
    request: SavedJobCreate,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Create a wishlist job entry without triggering any workflow."""
    user_id = user_id or "default"
    job = job_store.create_saved_job(
        user_id=user_id,
        job_title=request.job_title,
        company_name=request.company_name,
        listing_url=request.listing_url,
        job_description_text=request.job_description_text,
        salary=request.salary,
        employment_type=request.employment_type,
    )
    return job


@app.get("/api/jobs/saved")
async def list_saved_jobs(user_id: str = Header(None, alias="X-User-ID")):
    """List all saved (wishlist) jobs for the current user."""
    user_id = user_id or "default"
    jobs = job_store.list_jobs(user_id=user_id, limit=200, outcome_status="saved")
    return {"jobs": jobs}


@app.delete("/api/jobs/saved/{job_id}")
async def delete_saved_job(job_id: str, user_id: str = Header(None, alias="X-User-ID")):
    """Remove a job from the wishlist."""
    user_id = user_id or "default"
    deleted = job_store.delete_saved_job(job_id=job_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Saved job {job_id} not found")
    return {"message": f"Saved job {job_id} removed"}


@app.get("/api/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Get the status of a job application processing task"""
    job = job_store.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    return JobStatusResponse(
        job_id=job["job_id"],
        status=job["status"],
        progress=job["progress"],
        current_step=job["current_step"],
        message=job["message"],
        output_dir=job["output_dir"],
        ats_score=job["ats_score"],
        files=job["files"],
        error=job["error"],
        cv_version_id=job.get("cv_version_id"),
        backend_type=job.get("backend_type"),
        company_name=job.get("company_name"),
        job_title=job.get("job_title"),
        created_at=job.get("created_at"),
        completed_at=job.get("updated_at") if job["status"] == "completed" else None,
    )


@app.get("/api/jobs")
async def list_jobs(
    limit: int = 50,
    outcome_status: Optional[str] = None,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """List recent job processing tasks, optionally filtered by outcome status"""
    user_id = user_id or "default"
    jobs = job_store.list_jobs(user_id=user_id, limit=limit, outcome_status=outcome_status)
    return {"jobs": jobs, "total": len(jobs)}


@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str, user_id: str = Header(None, alias="X-User-ID")):
    """Delete a job and optionally its output files"""
    user_id = user_id or "default"
    job = job_store.get_job(job_id, user_id=user_id)

    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    # Delete from store (with user verification)
    job_store.delete_job(job_id, user_id=user_id)

    # Clean up uploaded files
    for pattern in [f"{job_id}_cv*", f"{job_id}_job*"]:
        for f in settings.UPLOADS_DIR.glob(pattern):
            f.unlink()

    return {"message": f"Job {job_id} deleted"}


@app.patch("/api/jobs/{job_id}/outcome")
async def update_job_outcome(
    job_id: str,
    request: OutcomeUpdateRequest,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """
    Update the application outcome status for a job.

    Status flow: draft -> submitted -> response -> interview -> offer/rejected/withdrawn

    Timestamps are automatically set:
    - submitted -> sets submitted_at
    - response/interview -> sets response_at (if not already set)
    - offer/rejected/withdrawn -> sets outcome_at
    """
    user_id = user_id or "default"

    # Validate outcome_status
    valid_statuses = ["draft", "submitted", "response", "interview", "offer", "rejected", "withdrawn"]
    if request.outcome_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid outcome_status. Must be one of: {', '.join(valid_statuses)}"
        )

    try:
        job = job_store.update_outcome(
            job_id,
            outcome_status=request.outcome_status,
            notes=request.notes,
            user_id=user_id
        )
        return job
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")


@app.patch("/api/jobs/{job_id}/metadata")
async def update_job_metadata(
    job_id: str,
    request: JobMetadataRequest,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """
    Update optional metadata for a job application.
    """
    user_id = user_id or "default"

    try:
        job = job_store.update_job(
            job_id,
            user_id=user_id,
            employment_type=request.employment_type,
            salary=request.salary,
            listing_url=request.listing_url,
        )
        return job
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")


@app.patch("/api/jobs/{job_id}/profile")
async def toggle_profile_include(
    job_id: str,
    request: ProfileIncludeRequest,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Toggle a job's inclusion in the position profiling corpus (Idea #242)."""
    user_id = user_id or "default"
    try:
        job = job_store.set_profile_include(job_id, request.include, user_id=user_id)
        return {"job_id": job_id, "include_in_profile": job["include_in_profile"]}
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")


@app.get("/api/position-profile")
async def get_position_profile(user_id: str = Header(None, alias="X-User-ID")):
    """Aggregate ATS analysis from included jobs to produce a position profile (Idea #242).

    Returns:
    - job_count: number of jobs in the corpus
    - skill_frequency: top skills ranked by how often they appear in targeted JDs,
      with match_rate showing how often the user's CV matched that skill
    - consistent_gaps: high-frequency skills where match_rate < 50%
    - strengths: high-frequency skills where match_rate >= 70%
    - role_distribution: most common job titles in the corpus
    - corpus_jobs: the jobs included in the analysis
    """
    user_id = user_id or "default"
    return job_store.get_position_profile(user_id=user_id)


@app.get("/api/jobs/{job_id}/stage-history")
async def get_job_stage_history(
    job_id: str,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Return stage transition history for a job (Idea #493)."""
    user_id = user_id or "default"
    try:
        history = job_store.get_stage_history(job_id, user_id=user_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return {"job_id": job_id, "history": history}


@app.get("/api/jobs/{job_id}/description")
async def get_job_description(job_id: str):
    """
    Get the original job description text for a job.

    Returns the stored JD text, or reads from the file for legacy jobs.
    """
    job = job_store.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    # Try to get stored text first, fallback to file read for legacy jobs
    description = job_store.get_job_description_text(job_id)

    if description:
        return {
            "job_id": job_id,
            "description": description,
            "source": "database" if job.get("job_description_text") else "file"
        }

    return {
        "job_id": job_id,
        "description": None,
        "source": None,
        "message": "Job description not available"
    }


def _generate_placement_suggestions(ats: dict) -> list[dict]:
    """Idea #100: Surface where existing CV content maps to JD requirements but is buried or underselling.

    Three suggestion types:
    - skills_only: skill listed in Skills section but not demonstrated in Experience
    - projects_not_experience: skill shown in Projects but absent from Experience
    - weak_evidence: skill exists but lacks quantified context
    """
    section = ats.get("section_analysis", {})
    gap = ats.get("gap_analysis", {})
    entities = ats.get("parsed_entities", {})

    experience_set = {s.lower() for s in section.get("experience_matches", [])}
    skills_set = {s.lower() for s in section.get("skills_matches", [])}
    projects_set = {s.lower() for s in section.get("projects_matches", [])}
    jd_required = {s.lower() for s in entities.get("jd_required_skills", [])}
    weak_evidence = {s.lower() for s in gap.get("evidence_gaps", {}).get("weak_evidence_skills", [])}

    suggestions: list[dict] = []

    # Type 1: In Skills section only — not backed by any experience or project
    skills_only = skills_set - experience_set - projects_set
    for skill in sorted(skills_only & jd_required)[:4]:
        suggestions.append({
            "type": "skills_only", "priority": "high", "skill": skill,
            "message": f'"{skill}" is listed in your Skills section but not demonstrated in any Experience bullet. '
                       f"Add an achievement that shows {skill} in practice to boost evidence scoring.",
            "section_hint": "experience",
        })
    for skill in sorted(skills_only - jd_required)[:3]:
        suggestions.append({
            "type": "skills_only", "priority": "medium", "skill": skill,
            "message": f'"{skill}" appears in Skills only. Adding a supporting experience bullet strengthens ATS evidence.',
            "section_hint": "experience",
        })

    # Type 2: Demonstrated in Projects but not in Experience — promote it
    projects_not_exp = projects_set - experience_set
    for skill in sorted(projects_not_exp & jd_required)[:3]:
        suggestions.append({
            "type": "projects_not_experience", "priority": "medium", "skill": skill,
            "message": f'"{skill}" appears in your Projects but not in Experience. '
                       f"If you used {skill} in a work role, add it to an Experience bullet — experience carries more ATS weight.",
            "section_hint": "experience",
        })

    # Type 3: Weak evidence — skill is present but lacks quantified context; deduplicate with above
    already_flagged = {s["skill"] for s in suggestions}
    for skill in sorted(weak_evidence & jd_required)[:4]:
        if skill not in already_flagged:
            suggestions.append({
                "type": "weak_evidence", "priority": "medium", "skill": skill,
                "message": f'"{skill}" is mentioned but lacks context. Strengthen it with a metric or outcome '
                           f'(e.g. "Built X using {skill}, reducing Y by 30%").',
                "section_hint": "experience",
            })

    # Sort: high before medium, then alphabetically by skill
    priority_order = {"high": 0, "medium": 1, "low": 2}
    suggestions.sort(key=lambda s: (priority_order.get(s["priority"], 9), s["skill"]))
    return suggestions[:10]


def _enrich_evidence_gaps(ats: dict) -> list[dict]:
    """Idea #78: Add section badges and specific advice to each weak-evidence skill card.

    Reads already-stored section_analysis data to determine where each weak-evidence
    skill appears and what the user should do about it.
    """
    section = ats.get("section_analysis", {})
    gap = ats.get("gap_analysis", {})

    experience_set = {s.lower() for s in section.get("experience_matches", [])}
    skills_set = {s.lower() for s in section.get("skills_matches", [])}
    projects_set = {s.lower() for s in section.get("projects_matches", [])}
    weak_skills = gap.get("evidence_gaps", {}).get("weak_evidence_skills", [])

    result: list[dict] = []
    for skill in weak_skills:
        skill_lower = skill.lower()
        in_experience = skill_lower in experience_set
        in_skills = skill_lower in skills_set
        in_projects = skill_lower in projects_set

        found_in: list[str] = []
        if in_experience:
            found_in.append("experience")
        if in_skills:
            found_in.append("skills")
        if in_projects:
            found_in.append("projects")

        if in_skills and not in_experience and not in_projects:
            advice = "Listed in Skills only — add an Experience bullet showing how you applied it"
        elif in_projects and not in_experience:
            advice = "Demonstrated in Projects — promote to Experience for higher ATS weight"
        elif in_experience:
            advice = "In Experience but lacks metrics — add quantified results"
        else:
            advice = "Add this skill with concrete examples to your Experience section"

        result.append({"skill": skill, "found_in": found_in, "advice": advice})

    return result


def _enrich_experience_gap(analysis: dict, user_id: str) -> None:
    """Idea #309: Replace CV text-parsed years with career span calculated from Profile job history.

    Mutates analysis in place. Adds two fields to experience_gaps:
      - cv_years_source: 'profile' | 'cv_text'
      - experience_match: True when profile years >= JD required years
    Sets gap to 0 when profile years meet the requirement.
    """
    from datetime import date as _date

    gap_analysis = analysis.get("gap_analysis")
    if not gap_analysis:
        return

    exp_gaps = gap_analysis.get("experience_gaps", {})
    jd_years = exp_gaps.get("jd_years")
    if not jd_years:
        return  # Nothing to compare against

    job_history = profile_store.list_job_history(user_id)
    if not job_history:
        return  # No profile data — keep CV text parsing result

    today = _date.today()
    earliest_start = None
    for record in job_history:
        start_str = record.get("start_date")
        if not start_str:
            continue
        try:
            clean = str(start_str)[:10]
            if len(clean) == 7:  # YYYY-MM — pad to first of month
                clean += "-01"
            start = _date.fromisoformat(clean)
        except ValueError:
            continue
        if earliest_start is None or start < earliest_start:
            earliest_start = start

    if earliest_start is None:
        return  # No parseable start dates

    career_years = round((today - earliest_start).days / 365.25, 1)
    is_match = career_years >= jd_years

    exp_gaps["cv_years"] = career_years
    exp_gaps["gap"] = 0 if is_match else round(jd_years - career_years, 1)
    exp_gaps["cv_years_source"] = "profile"
    exp_gaps["experience_match"] = is_match


@app.get("/api/jobs/{job_id}/ats-analysis")
async def get_ats_analysis(job_id: str, user_id: str = Header(None, alias="X-User-ID")):
    """
    Get detailed ATS analysis for a completed job (Track 2.9.2).

    Returns the full ATS analysis data including:
    - Hybrid scoring breakdown (lexical, semantic, evidence)
    - Category scores (critical keywords, hard skills, etc.)
    - Section-level analysis
    - Semantic matching details
    - Parsed entities from CV and JD
    - Keyword placement suggestions (Idea #100)
    """
    job = job_store.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="ATS analysis only available for completed jobs")

    # Try to get stored ATS details
    ats_details = job.get("ats_details")

    if ats_details:
        try:
            analysis = json.loads(ats_details)
            analysis["keyword_placement"] = _generate_placement_suggestions(analysis)
            analysis["evidence_gap_details"] = _enrich_evidence_gaps(analysis)
            _enrich_experience_gap(analysis, user_id or "default")
            return {
                "job_id": job_id,
                "ats_score": job.get("ats_score"),
                "analysis": analysis,
                "source": "database"
            }
        except json.JSONDecodeError:
            pass

    # No stored details available
    return {
        "job_id": job_id,
        "ats_score": job.get("ats_score"),
        "analysis": None,
        "source": None,
        "message": "Detailed ATS analysis not available for this job (created before Track 2.9.2)"
    }


@app.post("/api/jobs/{job_id}/rematch")
async def rematch_ats(
    job_id: str,
    request: RematchRequest,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Re-run ATS analysis for an existing job using a new CV version.

    Runs only the ATS scoring pipeline (no CV generation, cover letter, or Q&A).
    Updates the job record with the new score, details, and CV version ID.
    """
    user_id = user_id or "default"

    if not WORKFLOW_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Workflow modules not available. Check server logs.",
        )

    job = job_store.get_job(job_id, user_id=user_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    if job["status"] != "completed":
        raise HTTPException(
            status_code=400, detail="Can only re-match completed jobs"
        )

    cv_content = cv_store.get_cv_version_content(request.cv_version_id)
    if not cv_content:
        raise HTTPException(
            status_code=404,
            detail=f"CV version {request.cv_version_id} not found",
        )

    job_description = job_store.get_job_description_text(job_id)
    if not job_description:
        raise HTTPException(
            status_code=400,
            detail="Job description text not available for this job",
        )

    # Reconstruct LLM backend from job's stored backend_type
    backend_type = job.get("backend_type", "ollama")
    backend_config = _build_backend_config(backend_type)

    backend = LLMBackendFactory.create_backend(backend_type, **backend_config)
    ats_optimizer = ATSOptimizer(
        backend=backend, company_name=job.get("company_name")
    )

    old_score = job.get("ats_score")

    loop = asyncio.get_event_loop()
    _report, _key_req, ats_score_dict = await loop.run_in_executor(
        None, ats_optimizer.generate_ats_report, cv_content, job_description
    )

    new_score = ats_score_dict["score"]
    delta = round(new_score - (old_score or 0), 1)
    ats_details_json = json.dumps(ats_score_dict)

    job_store.update_job(
        job_id,
        ats_score=new_score,
        ats_details=ats_details_json,
        cv_version_id=request.cv_version_id,
    )

    # Record re-match in history (Idea #121)
    match_history_store.add_entry(
        job_id=job_id,
        score=new_score,
        cv_version_id=request.cv_version_id,
        matched=ats_score_dict.get('matched'),
        total=ats_score_dict.get('total'),
        missing_count=len(ats_score_dict.get('missing_keywords', [])),
    )

    ats_score_dict["keyword_placement"] = _generate_placement_suggestions(ats_score_dict)
    return {
        "job_id": job_id,
        "old_score": old_score,
        "new_score": new_score,
        "delta": delta,
        "ats_details": ats_score_dict,
        "cv_version_id": request.cv_version_id,
    }


@app.post("/api/jobs/{job_id}/apply-suggestions")
async def apply_suggestions(
    job_id: str,
    request: ApplySuggestionsRequest,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Use LLM to incorporate selected missing keywords into CV text.

    Does NOT save — returns revised CV for user review.
    """
    user_id = user_id or "default"

    if not WORKFLOW_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Workflow modules not available. Check server logs.",
        )

    job = job_store.get_job(job_id, user_id=user_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    if job["status"] != "completed":
        raise HTTPException(
            status_code=400, detail="Can only apply suggestions to completed jobs"
        )

    if not request.selected_keywords:
        raise HTTPException(
            status_code=400, detail="No keywords selected"
        )

    cv_content = cv_store.get_cv_version_content(request.cv_version_id)
    if not cv_content:
        raise HTTPException(
            status_code=404,
            detail=f"CV version {request.cv_version_id} not found",
        )

    job_description = job_store.get_job_description_text(job_id)
    if not job_description:
        raise HTTPException(
            status_code=400,
            detail="Job description text not available for this job",
        )

    # Use request overrides or fall back to job's original backend
    backend_type = request.backend_type or job.get("backend_type", "ollama")
    backend_config = _build_backend_config(backend_type, request.model_name)

    backend = LLMBackendFactory.create_backend(backend_type, **backend_config)
    ats_optimizer = ATSOptimizer(
        backend=backend, company_name=job.get("company_name")
    )

    model_name = backend_config.get("model_name", backend_type)

    # PII scrubbing: strip employer names and personal info before LLM call
    profile = profile_store.get_or_create_profile(user_id)
    job_history = profile_store.list_job_history(user_id)
    scrub_result = pii_scrubber.scrub(cv_content, profile, job_history)

    loop = asyncio.get_event_loop()
    raw_revised = await loop.run_in_executor(
        None,
        ats_optimizer.incorporate_keywords,
        scrub_result.scrubbed_text,
        job_description,
        request.selected_keywords,
        request.weak_skills,
    )

    # Restore PII in LLM output
    revised_cv = pii_scrubber.restore(raw_revised, scrub_result.replacements)

    # Split CV text from changelog (LLM outputs ===CHANGELOG=== separator)
    changelog = ""
    if "===CHANGELOG===" in revised_cv:
        parts = revised_cv.split("===CHANGELOG===", 1)
        revised_cv = parts[0].rstrip()
        changelog = parts[1].strip()

    # Strip LLM preamble — anything before the actual CV content
    _preamble = (
        "here is", "below is", "i've", "i have", "sure", "certainly",
        "of course", "the updated", "the revised", "updated cv",
    )
    lines = revised_cv.split("\n")
    for i, line in enumerate(lines):
        stripped = line.strip().lower()
        if stripped and not stripped.startswith(_preamble):
            if i > 0:
                revised_cv = "\n".join(lines[i:])
            break

    return {
        "job_id": job_id,
        "revised_cv": revised_cv,
        "applied_count": len(request.selected_keywords),
        "cv_version_id": request.cv_version_id,
        "backend_type": backend_type,
        "model_name": model_name,
        "changelog": changelog,
    }


@app.post("/api/jobs/{job_id}/suggest-skills")
async def suggest_skills(
    job_id: str,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Use LLM to suggest skills to add to the CV based on the job description (Idea #56)."""
    user_id = user_id or "default"

    if not WORKFLOW_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Workflow modules not available. Check server logs.",
        )

    job = job_store.get_job(job_id, user_id=user_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    if job["status"] != "completed":
        raise HTTPException(
            status_code=400, detail="Can only suggest skills for completed jobs"
        )

    # Get CV content from the job's CV version
    cv_version_id = job.get("cv_version_id")
    cv_content = None
    if cv_version_id:
        cv_content = cv_store.get_cv_version_content(cv_version_id)

    if not cv_content:
        raise HTTPException(
            status_code=400,
            detail="CV content not available for this job",
        )

    job_description = job_store.get_job_description_text(job_id)
    if not job_description:
        raise HTTPException(
            status_code=400,
            detail="Job description text not available for this job",
        )

    # Use job's backend or default to best available cloud backend
    backend_type = job.get("backend_type") or _default_cloud_backend()
    backend_config = _build_backend_config(backend_type)

    backend = LLMBackendFactory.create_backend(backend_type, **backend_config)
    ats_optimizer = ATSOptimizer(
        backend=backend, company_name=job.get("company_name")
    )

    # PII scrubbing: strip employer names and personal info before LLM call
    profile = profile_store.get_or_create_profile(user_id)
    job_history_records = profile_store.list_job_history(user_id)
    scrub_result = pii_scrubber.scrub(cv_content, profile, job_history_records)

    loop = asyncio.get_event_loop()
    suggestions = await loop.run_in_executor(
        None,
        ats_optimizer.suggest_skills,
        scrub_result.scrubbed_text,
        job_description,
    )
    # No restore needed — response is a skills list, not CV text

    return {"suggestions": suggestions}


@app.post("/api/jobs/{job_id}/gap-fill")
async def gap_fill(
    job_id: str,
    request: GapFillRequest,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Incorporate user-provided experiences into CV via LLM (Idea #82)."""
    user_id = user_id or "default"

    if not WORKFLOW_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Workflow modules not available. Check server logs.",
        )

    job = job_store.get_job(job_id, user_id=user_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    if job["status"] != "completed":
        raise HTTPException(
            status_code=400, detail="Can only gap-fill completed jobs"
        )

    filled_answers = [
        {"skill": a.skill, "gap_type": a.gap_type, "user_content": a.user_content}
        for a in request.answers
        if a.user_content.strip()
    ]

    if not filled_answers:
        raise HTTPException(status_code=400, detail="No answers provided")

    cv_content = cv_store.get_cv_version_content(request.cv_version_id)
    if not cv_content:
        raise HTTPException(
            status_code=404,
            detail=f"CV version {request.cv_version_id} not found",
        )

    job_description = job_store.get_job_description_text(job_id)
    if not job_description:
        raise HTTPException(
            status_code=400,
            detail="Job description text not available for this job",
        )

    backend_type = request.backend_type or job.get("backend_type", "ollama")
    backend_config = _build_backend_config(backend_type, request.model_name)

    backend = LLMBackendFactory.create_backend(backend_type, **backend_config)
    ats_optimizer = ATSOptimizer(
        backend=backend, company_name=job.get("company_name")
    )

    model_name = backend_config.get("model_name", backend_type)

    # PII scrubbing: strip employer names and personal info before LLM call
    profile = profile_store.get_or_create_profile(user_id)
    job_history_records = profile_store.list_job_history(user_id)
    scrub_result = pii_scrubber.scrub(cv_content, profile, job_history_records)

    loop = asyncio.get_event_loop()
    raw_revised = await loop.run_in_executor(
        None,
        ats_optimizer.incorporate_user_experiences,
        scrub_result.scrubbed_text,
        job_description,
        filled_answers,
    )

    # Restore PII in LLM output
    revised_cv = pii_scrubber.restore(raw_revised, scrub_result.replacements)

    changelog = ""
    if "===CHANGELOG===" in revised_cv:
        parts = revised_cv.split("===CHANGELOG===", 1)
        revised_cv = parts[0].rstrip()
        changelog = parts[1].strip()

    _preamble = (
        "here is", "below is", "i've", "i have", "sure", "certainly",
        "of course", "the updated", "the revised", "updated cv",
    )
    lines = revised_cv.split("\n")
    for i, line in enumerate(lines):
        stripped = line.strip().lower()
        if stripped and not stripped.startswith(_preamble):
            if i > 0:
                revised_cv = "\n".join(lines[i:])
            break

    return {
        "job_id": job_id,
        "revised_cv": revised_cv,
        "applied_count": len(filled_answers),
        "cv_version_id": request.cv_version_id,
        "backend_type": backend_type,
        "model_name": model_name,
        "changelog": changelog,
    }


@app.get("/api/jobs/{job_id}/match-history")
async def get_match_history(
    job_id: str,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Get ATS match iteration history for a job (Idea #121)."""
    user_id = user_id or "default"
    job = job_store.get_job(job_id, user_id=user_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    history = match_history_store.get_history(job_id)
    return {"job_id": job_id, "history": history}


@app.get("/api/metrics", response_model=MetricsResponse)
async def get_metrics(user_id: str = Header(None, alias="X-User-ID")):
    """
    Get application funnel metrics and success rates for the current user.

    Returns:
    - total: Total completed jobs
    - by_status: Count of jobs by outcome status
    - funnel: Progression through stages (draft -> submitted -> response -> interview -> offer)
    - rates: Response rate, interview rate, offer rate (as percentages)
    - avg_time_to_response_days: Average days from submission to first response
    """
    user_id = user_id or "default"
    metrics = job_store.get_outcome_metrics(user_id=user_id)
    return MetricsResponse(**metrics)


@app.get("/api/pipeline/diagnosis", response_model=PipelineDiagnosisResponse)
async def get_pipeline_diagnosis(user_id: str = Header(None, alias="X-User-ID")):
    """
    Analyze the application funnel and provide a diagnosis and advice.
    """
    user_id = user_id or "default"
    diagnosis = job_store.get_pipeline_diagnosis(user_id=user_id)
    return PipelineDiagnosisResponse(**diagnosis)


@app.get("/api/jobs/{job_id}/files")
async def list_job_files(job_id: str):
    """List output files for a completed job"""
    job = job_store.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    
    if job["status"] != JobStatus.completed:
        raise HTTPException(status_code=400, detail="Job not completed yet")
    
    if not job["output_dir"]:
        raise HTTPException(status_code=404, detail="No output directory found")
    
    output_dir = Path(job["output_dir"])
    if not output_dir.exists():
        raise HTTPException(status_code=404, detail="Output directory not found")
    
    files = []
    for f in output_dir.iterdir():
        if f.is_file():
            # Determine file type
            file_type = "other"
            if "cv" in f.name.lower():
                file_type = "cv"
            elif "cover_letter" in f.name.lower():
                file_type = "cover_letter"
            elif "ats" in f.name.lower():
                file_type = "ats_report"
            elif "answers" in f.name.lower():
                file_type = "answers"
            elif f.name == "metadata.json":
                file_type = "metadata"
            
            files.append({
                "filename": f.name,
                "path": str(f),
                "size": f.stat().st_size,
                "type": file_type
            })
    
    return {"job_id": job_id, "files": files}


@app.get("/api/jobs/{job_id}/files/{filename}")
async def download_file(job_id: str, filename: str):
    """Download a specific output file"""
    job = job_store.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    if not job["output_dir"]:
        raise HTTPException(status_code=404, detail="No output directory found")

    file_path = Path(job["output_dir"]) / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File {filename} not found")

    # Determine media type
    media_type = "application/octet-stream"
    if filename.endswith(".md"):
        media_type = "text/markdown"
    elif filename.endswith(".txt"):
        media_type = "text/plain"
    elif filename.endswith(".json"):
        media_type = "application/json"
    elif filename.endswith(".docx"):
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=media_type
    )


@app.get("/api/jobs/{job_id}/files/{filename}/content")
async def get_file_content(job_id: str, filename: str):
    """Get the text content of a file for preview (supports .md, .txt, .json)"""
    job = job_store.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    if not job["output_dir"]:
        raise HTTPException(status_code=404, detail="No output directory found")

    file_path = Path(job["output_dir"]) / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File {filename} not found")

    # Only allow text-based files
    allowed_extensions = ['.md', '.txt', '.json']
    if not any(filename.endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Preview not supported for this file type. Allowed: {', '.join(allowed_extensions)}"
        )

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        return {
            "filename": filename,
            "content": content,
            "type": "markdown" if filename.endswith('.md') else "json" if filename.endswith('.json') else "text"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")


@app.get("/api/applications")
async def list_applications(
    limit: int = 50,
    outcome_status: Optional[str] = None,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """
    List all processed applications with outcome tracking data for the current user.
    Combines filesystem data with database outcome tracking.
    """
    user_id = user_id or "default"
    applications = []

    # Get jobs from database (has outcome tracking) - filtered by user
    jobs = job_store.list_jobs(user_id=user_id, limit=500, outcome_status=outcome_status)
    job_map = {j["job_id"]: j for j in jobs}

    if settings.OUTPUTS_DIR.exists():
        for folder in settings.OUTPUTS_DIR.iterdir():
            if folder.is_dir():
                metadata_path = folder / "metadata.json"

                app_info = {
                    "job_id": folder.name,
                    "job_name": folder.name.split("_")[0] if "_" in folder.name else folder.name,
                    "company_name": None,
                    "job_title": None,
                    "backend": "unknown",
                    "model": None,
                    "timestamp": folder.stat().st_mtime,
                    "ats_score": None,
                    "status": "completed",
                    "output_dir": str(folder),
                    # Outcome tracking fields (defaults)
                    "outcome_status": "draft",
                    "submitted_at": None,
                    "response_at": None,
                    "outcome_at": None,
                    "notes": None,
                }

                # Try to read metadata
                if metadata_path.exists():
                    try:
                        with open(metadata_path) as f:
                            metadata = json.load(f)
                            app_info["company_name"] = metadata.get("company_name")
                            app_info["backend"] = metadata.get("backend", {}).get("type", "unknown")
                            app_info["model"] = metadata.get("backend", {}).get("model")
                            app_info["ats_score"] = metadata.get("ats_score")
                            app_info["timestamp"] = metadata.get("timestamp", app_info["timestamp"])

                            # Try to get job_id from metadata
                            if "job_id" in metadata:
                                app_info["job_id"] = metadata["job_id"]
                    except:
                        pass

                # Only include applications that belong to this user
                # (must have a matching job_id in the user's database records)
                db_job = job_map.get(app_info["job_id"])
                if not db_job:
                    # No database record for this user - skip it
                    continue

                # Merge data from database
                app_info["company_name"] = db_job.get("company_name") or app_info["company_name"]
                app_info["job_title"] = db_job.get("job_title")
                # DB ats_score is always up-to-date (rematch updates DB but not metadata.json)
                if db_job.get("ats_score") is not None:
                    app_info["ats_score"] = db_job["ats_score"]
                app_info["outcome_status"] = db_job.get("outcome_status", "draft")
                app_info["submitted_at"] = db_job.get("submitted_at")
                app_info["response_at"] = db_job.get("response_at")
                app_info["outcome_at"] = db_job.get("outcome_at")
                app_info["notes"] = db_job.get("notes")

                # Apply outcome_status filter if specified
                if outcome_status and app_info["outcome_status"] != outcome_status:
                    continue

                applications.append(app_info)

    # Sort by timestamp (newest first)
    applications.sort(key=lambda x: x["timestamp"], reverse=True)

    return {"applications": applications[:limit], "total": len(applications)}


# ============================================================================
# CV Management Endpoints
# ============================================================================

@app.get("/api/cvs")
async def list_cvs(user_id: str = Header(None, alias="X-User-ID")):
    """List all stored CVs for the current user (without content)."""
    user_id = user_id or "default"
    cvs = cv_store.list_cvs(user_id=user_id)
    return {"cvs": cvs, "total": len(cvs)}


@app.post("/api/cvs")
async def create_cv(
    cv_file: UploadFile = File(...),
    name: str = Form(...),
    is_default: bool = Form(False),
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Upload and store a new CV for the current user."""
    user_id = user_id or "default"
    try:
        # Read file content
        content = await cv_file.read()
        content_str = content.decode('utf-8')

        # Create CV in store with user_id
        cv = cv_store.create_cv(
            name=name,
            filename=cv_file.filename,
            content=content_str,
            user_id=user_id,
            is_default=is_default
        )

        # Return without the full content
        return {
            "id": cv["id"],
            "user_id": cv["user_id"],
            "name": cv["name"],
            "filename": cv["filename"],
            "is_default": cv["is_default"],
            "created_at": cv["created_at"],
            "version_number": cv.get("version_number", 1),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cvs/{cv_id}")
async def get_cv(cv_id: int, user_id: str = Header(None, alias="X-User-ID")):
    """Get a CV by ID (includes content). Verifies user ownership."""
    user_id = user_id or "default"
    cv = cv_store.get_cv(cv_id, user_id=user_id)
    if not cv:
        raise HTTPException(status_code=404, detail=f"CV {cv_id} not found")
    return cv


@app.delete("/api/cvs/{cv_id}")
async def delete_cv(cv_id: int, user_id: str = Header(None, alias="X-User-ID")):
    """Delete a CV. Verifies user ownership."""
    user_id = user_id or "default"
    deleted = cv_store.delete_cv(cv_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"CV {cv_id} not found")
    return {"message": f"CV {cv_id} deleted"}


class CVRenameRequest(BaseModel):
    """Request to rename a CV."""
    name: str


@app.put("/api/cvs/{cv_id}/name")
async def rename_cv(cv_id: int, request: CVRenameRequest, user_id: str = Header(None, alias="X-User-ID")):
    """Rename a CV. Verifies user ownership."""
    user_id = user_id or "default"
    if not request.name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    updated = cv_store.update_cv(cv_id, user_id=user_id, name=request.name.strip())
    if not updated:
        raise HTTPException(status_code=404, detail=f"CV {cv_id} not found")
    return updated


@app.put("/api/cvs/{cv_id}/default")
async def set_default_cv(cv_id: int, user_id: str = Header(None, alias="X-User-ID")):
    """Set a CV as the default for the current user."""
    user_id = user_id or "default"
    updated = cv_store.set_default(cv_id, user_id=user_id)
    if not updated:
        raise HTTPException(status_code=404, detail=f"CV {cv_id} not found")
    return {"message": f"CV {cv_id} set as default"}


@app.get("/api/cvs/default")
async def get_default_cv(user_id: str = Header(None, alias="X-User-ID")):
    """Get the default CV for the current user."""
    user_id = user_id or "default"
    cv = cv_store.get_default_cv(user_id=user_id)
    if not cv:
        raise HTTPException(status_code=404, detail="No default CV set")
    # Return without full content for listing
    return {
        "id": cv["id"],
        "user_id": cv["user_id"],
        "name": cv["name"],
        "filename": cv["filename"],
        "is_default": cv["is_default"],
        "created_at": cv["created_at"],
        "version_number": cv.get("version_number", 1),
    }


# ============================================================================
# CV Version Endpoints (Track 2.9.3)
# ============================================================================

@app.get("/api/cvs/{cv_id}/versions")
async def list_cv_versions(cv_id: int, user_id: str = Header(None, alias="X-User-ID")):
    """List all versions of a CV (metadata only, no content)."""
    user_id = user_id or "default"
    versions = cv_store.list_cv_versions(cv_id, user_id=user_id)
    if versions is None:
        raise HTTPException(status_code=404, detail=f"CV {cv_id} not found")
    return {"cv_id": cv_id, "versions": versions, "total": len(versions)}


@app.get("/api/cvs/{cv_id}/versions/{version_id}")
async def get_cv_version(cv_id: int, version_id: int, user_id: str = Header(None, alias="X-User-ID")):
    """Get a specific CV version with full content."""
    user_id = user_id or "default"
    # Verify CV ownership first
    versions = cv_store.list_cv_versions(cv_id, user_id=user_id)
    if versions is None:
        raise HTTPException(status_code=404, detail=f"CV {cv_id} not found")

    version = cv_store.get_cv_version(version_id)
    if not version or version["cv_id"] != cv_id:
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found for CV {cv_id}")
    return version


@app.get("/api/cv-versions/{version_id}")
async def get_cv_version_by_id(version_id: int, user_id: str = Header(None, alias="X-User-ID")):
    """Get a CV version by version ID alone (without needing cv_id).

    Jobs store only version_id, not cv_id, so this endpoint lets the
    frontend fetch the version content directly.
    """
    user_id = user_id or "default"
    version = cv_store.get_cv_version(version_id)
    if not version:
        raise HTTPException(status_code=404, detail=f"CV version {version_id} not found")

    # Verify user ownership via the parent CV
    cv = cv_store.get_cv(version["cv_id"], user_id=user_id)
    if not cv:
        raise HTTPException(status_code=404, detail=f"CV version {version_id} not found")

    return version


@app.put("/api/cvs/{cv_id}/content")
async def update_cv_content(
    cv_id: int,
    request: CVContentUpdateRequest,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Update CV content, creating a new version.

    Used by the in-app CV text editor after ATS analysis review.
    """
    user_id = user_id or "default"
    updated = cv_store.update_cv(
        cv_id,
        user_id=user_id,
        content=request.content,
        change_summary=request.change_summary,
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"CV {cv_id} not found")
    return updated


@app.delete("/api/cvs/{cv_id}/versions/{version_id}")
async def delete_cv_version(
    cv_id: int,
    version_id: int,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Delete a single CV version. Cannot delete the last remaining version."""
    user_id = user_id or "default"
    result = cv_store.delete_cv_version(version_id, user_id)
    if result.get("error") == "not_found":
        raise HTTPException(status_code=404, detail="Version not found")
    if result.get("error") == "last_version":
        raise HTTPException(status_code=409, detail="Cannot delete the last version of a CV")
    return {"status": "deleted", "new_current_version_id": result.get("new_current_version_id")}


# ============================================================================
# CV Coach Endpoint
# ============================================================================

def _extract_experience_bullets(cv_text: str) -> list[str]:
    lines = cv_text.splitlines()
    bullets = []
    in_experience = False
    section_header_re = re.compile(r'^[A-Z][A-Z\s]{3,}$')
    experience_re = re.compile(r'EXPERIENCE|Work Experience|Employment', re.IGNORECASE)
    date_re = re.compile(r'\b(19|20)\d{2}\b.*\b(19|20)\d{2}\b|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec', re.IGNORECASE)
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if experience_re.search(stripped):
            in_experience = True
            continue
        if in_experience and section_header_re.match(stripped) and not experience_re.search(stripped):
            break
        if in_experience:
            if stripped[0] in '-•*–' or (len(stripped.split()) >= 5 and not date_re.search(stripped)):
                bullets.append(stripped)
    return bullets


_PASSIVE_PHRASES = re.compile(
    r'\b(responsible for|involved in|tasked with|worked on|helped to|assisted with|participated in|was responsible|were responsible|was involved|were involved)\b',
    re.IGNORECASE,
)

_BUZZWORDS = [
    "team player", "synergy", "synergies", "think outside the box",
    "results-driven", "results driven", "self-starter", "self starter",
    "go-getter", "detail-oriented", "detail oriented", "proactive",
    "passionate", "hardworking", "hard-working", "motivated", "dynamic",
    "forward-thinking", "forward thinking", "thought leader", "guru",
    "ninja", "rockstar", "rock star", "wizard", "evangelist",
    "game changer", "game-changer", "disruptive", "cutting-edge",
    "cutting edge", "world-class", "world class", "innovative thinker",
    "excellent communication skills", "strong communication skills",
    "outside the box", "value-add", "value add", "deep dive",
]

_STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "was", "are", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "shall", "can", "not", "no",
    "i", "my", "me", "we", "our", "you", "your", "it", "its", "this",
    "that", "these", "those", "as", "up", "out", "which", "who", "all",
    "more", "also", "into", "than", "so", "if", "they", "their", "its",
    "about", "over", "after", "before", "during", "within", "across",
    "each", "such", "both", "when", "where", "while", "through",
}


def _check_active_voice(cv_text: str) -> list[dict]:
    matches = _PASSIVE_PHRASES.findall(cv_text)
    count = len(matches)
    if count >= 4:
        priority = "high" if count >= 6 else "medium"
        return [{"priority": priority, "category": "style",
                 "message": f"{count} passive/weak phrases detected (e.g. 'responsible for', 'worked on'). "
                            "Start bullets with strong action verbs: Led, Built, Delivered, Reduced.",
                 "section_hint": "experience"}]
    if count >= 2:
        return [{"priority": "low", "category": "style",
                 "message": "Some passive phrases detected (e.g. 'responsible for'). "
                            "Prefer active verbs: Led, Built, Delivered, Reduced.",
                 "section_hint": "experience"}]
    return []


def _check_buzzwords(cv_text: str) -> list[dict]:
    text_lower = cv_text.lower()
    found = [phrase for phrase in _BUZZWORDS if phrase in text_lower]
    if not found:
        return []
    examples = ", ".join(f'"{w}"' for w in found[:3])
    if len(found) >= 3:
        priority = "high" if len(found) >= 5 else "medium"
        return [{"priority": priority, "category": "style",
                 "message": f"Overused buzzwords detected: {examples}. Replace with specific, measurable achievements.",
                 "section_hint": "general"}]
    return [{"priority": "low", "category": "style",
             "message": f"Buzzwords detected: {examples}. Prefer concrete examples over generic phrases.",
             "section_hint": "general"}]


def _check_word_repetition(cv_text: str) -> list[dict]:
    words = re.findall(r'\b[a-zA-Z]{4,}\b', cv_text.lower())
    freq: dict[str, int] = {}
    for w in words:
        if w not in _STOP_WORDS:
            freq[w] = freq.get(w, 0) + 1
    repeated = sorted([(w, c) for w, c in freq.items() if c >= 5], key=lambda x: -x[1])
    if len(repeated) >= 2:
        examples = ", ".join(f'"{w}" ({c}x)' for w, c in repeated[:3])
        priority = "medium" if repeated[0][1] >= 8 else "low"
        return [{"priority": priority, "category": "style",
                 "message": f"Repetitive vocabulary: {examples}. Vary your language to avoid sounding formulaic.",
                 "section_hint": "general"}]
    return []


def _generate_coach_suggestions(
    has_skills: bool, has_experience: bool, has_education: bool,
    has_projects: bool, has_summary: bool, weak_entities: list, cv_text: str,
) -> list[dict]:
    suggestions = []
    if not has_experience:
        suggestions.append({"priority": "high", "category": "completeness",
            "message": "No Work Experience section detected. Add EXPERIENCE with role, company, dates and bullet points.", "section_hint": "experience"})
    if len(weak_entities) > 3:
        suggestions.append({"priority": "high", "category": "evidence",
            "message": f"{len(weak_entities)} skills lack quantified evidence. Add metrics (e.g. 'reduced load time by 40%') to experience bullets.", "section_hint": "experience"})
    if not has_skills:
        suggestions.append({"priority": "high", "category": "completeness",
            "message": "No Skills section detected. Add a SKILLS section listing your technical and soft skills explicitly.", "section_hint": "skills"})
    if not re.search(r'@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', cv_text):
        suggestions.append({"priority": "high", "category": "formatting",
            "message": "No email address detected. Ensure contact details appear at the top.", "section_hint": "contact"})
    if not has_summary:
        suggestions.append({"priority": "medium", "category": "completeness",
            "message": "No Summary or Profile section detected. A 2-3 sentence professional summary helps ATS and recruiters quickly assess your fit.", "section_hint": "summary"})
    if not has_projects:
        suggestions.append({"priority": "medium", "category": "completeness",
            "message": "No Projects section detected. Adding one demonstrates practical skills beyond job history.", "section_hint": "projects"})
    if not has_education:
        suggestions.append({"priority": "medium", "category": "completeness",
            "message": "No Education section detected. Add degrees, diplomas, or certifications.", "section_hint": "education"})
    if len(cv_text) < 500:
        suggestions.append({"priority": "high", "category": "length",
            "message": "CV is very short. Aim for 400-500+ words for ATS to parse effectively.", "section_hint": "general"})
    elif len(cv_text) > 8000:
        suggestions.append({"priority": "low", "category": "length",
            "message": "CV is quite long. Consider condensing to 2 pages.", "section_hint": "general"})
    vague_bullets = [b for b in _extract_experience_bullets(cv_text) if not re.search(r'\d', b)]
    if len(vague_bullets) >= 2:
        example = vague_bullets[0][:60]
        count = len(vague_bullets)
        priority = 'high' if count >= 4 else 'medium'
        suggestions.append({
            'priority': priority,
            'category': 'impact',
            'message': (
                f"{count} achievement line{'s' if count != 1 else ''} lack measurable impact. "
                f"e.g. '{example}' — add numbers, percentages or outcomes."
            ),
            'section_hint': 'experience',
        })
    suggestions.extend(_check_active_voice(cv_text))
    suggestions.extend(_check_buzzwords(cv_text))
    suggestions.extend(_check_word_repetition(cv_text))
    return suggestions[:10]


@app.post("/api/cv-coach/assess")
async def assess_cv_coach(request: CVCoachAssessRequest):
    if not WORKFLOW_AVAILABLE:
        raise HTTPException(status_code=503, detail="Workflow modules not available")
    cv_text = request.cv_text.strip()
    if not cv_text:
        raise HTTPException(status_code=400, detail="cv_text must not be empty")
    try:
        from document_parser import DocumentParser
        parser = DocumentParser()
        parsed_cv = parser.parse_cv(cv_text)
        hard_skills = list(parsed_cv.get_hard_skills())
        soft_skills = list(parsed_cv.get_soft_skills())
        section_names = [s.section_type.value for s in parsed_cv.sections]
        experience_skills = [e.text for e in parsed_cv.entities if e.section and "experience" in e.section.lower()]
        project_skills = [e.text for e in parsed_cv.entities if e.section and "project" in e.section.lower()]
        skills_listed = [e.text for e in parsed_cv.entities if e.section and "skill" in e.section.lower()]
        strong, moderate, weak = [], [], []
        for entity in parsed_cv.entities:
            if entity.evidence_strength > 1.3:
                strong.append(entity)
            elif entity.evidence_strength >= 1.0:
                moderate.append(entity)
            else:
                weak.append(entity)
        avg_strength = round(sum(e.evidence_strength for e in parsed_cv.entities) / len(parsed_cv.entities), 2) if parsed_cv.entities else 0.0
        has_skills = len(hard_skills) > 0
        has_experience = len(experience_skills) > 0
        has_education = any("education" in n for n in section_names)
        has_projects = len(project_skills) > 0
        has_summary = any("summary" in n.lower() or "profile" in n.lower() or "objective" in n.lower() for n in section_names)
        completeness = (25 if has_skills else 0) + (30 if has_experience else 0) + (15 if has_education else 0) + (15 if has_projects else 0) + (15 if len(strong) > 0 else 0)
        quality_score = min(100, completeness + min(10, int(avg_strength * 5)))
        return {
            "quality_score": quality_score,
            "parsed_entities": {
                "cv_hard_skills": hard_skills[:15], "cv_soft_skills": soft_skills[:10],
                "jd_required_skills": [], "jd_preferred_skills": [],
                "cv_years_experience": parsed_cv.years_experience, "jd_years_required": None,
            },
            "section_analysis": {
                "experience_matches": experience_skills[:10], "skills_matches": skills_listed[:10],
                "projects_matches": project_skills[:5], "not_found_in_cv": [],
                "cv_sections_detected": len(parsed_cv.sections), "jd_sections_detected": 0,
            },
            "evidence_analysis": {
                "strong_evidence_count": len(strong), "moderate_evidence_count": len(moderate),
                "weak_evidence_count": len(weak), "average_strength": avg_strength,
                "strong_skills": [e.text for e in strong[:5]], "weak_skills": [e.text for e in weak[:5]],
            },
            "coaching_suggestions": _generate_coach_suggestions(has_skills, has_experience, has_education, has_projects, has_summary, weak, cv_text),
            "sections_detected": section_names,
            "cv_char_count": len(cv_text),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assessment failed: {str(e)}")


def _build_profile_context(
    profile: Dict[str, Any],
    job_history: List[Dict[str, Any]],
    certifications: List[Dict[str, Any]],
    skills: List[Dict[str, Any]],
    education: List[Dict[str, Any]],
    pd_items: List[Dict[str, Any]],
) -> str:
    """Assemble all profile sections into a structured plain-text context block."""
    from collections import defaultdict

    parts: List[str] = []

    headline = (profile.get("headline") or "").strip()
    if headline:
        parts.append(f"HEADLINE: {headline}")

    if job_history:
        lines = ["WORK EXPERIENCE"]
        for job in job_history:
            title = (job.get("title") or "").strip()
            employer = (job.get("employer") or "").strip()
            start = (job.get("start_date") or "").strip()
            end = "Present" if job.get("is_current") else (job.get("end_date") or "").strip()
            header = f"- {title}"
            if employer:
                header += f" at {employer}"
            if start or end:
                header += f" ({start} - {end})"
            lines.append(header)
            for field in ("description", "details"):
                content = (job.get(field) or "").strip()
                if content:
                    for line in content.splitlines():
                        stripped = line.strip()
                        if stripped:
                            lines.append(f"  {stripped}")
        parts.append("\n".join(lines))

    if skills:
        by_cat: Dict[str, List[str]] = defaultdict(list)
        for s in skills:
            cat = (s.get("category") or "Other").strip()
            name = (s.get("name") or "").strip()
            if name:
                by_cat[cat].append(name)
        if by_cat:
            lines = ["SKILLS"]
            for cat, names in by_cat.items():
                lines.append(f"  {cat}: {', '.join(names)}")
            parts.append("\n".join(lines))

    if certifications:
        lines = ["CERTIFICATIONS"]
        for c in certifications:
            name = (c.get("name") or "").strip()
            org = (c.get("org_display_label") or c.get("issuing_org") or "").strip()
            entry = f"- {name}"
            if org:
                entry += f" ({org})"
            lines.append(entry)
        parts.append("\n".join(lines))

    if education:
        lines = ["EDUCATION"]
        for e in education:
            qual = (e.get("qualification") or "").strip()
            field = (e.get("field_of_study") or "").strip()
            inst = (e.get("institution") or "").strip()
            end_date = (e.get("end_date") or "").strip()
            entry = f"- {qual}"
            if field:
                entry += f" in {field}"
            if inst:
                entry += f", {inst}"
            if end_date:
                entry += f" ({end_date})"
            lines.append(entry)
        parts.append("\n".join(lines))

    if pd_items:
        lines = ["PROFESSIONAL DEVELOPMENT"]
        for p in pd_items:
            ptype = (p.get("type") or "").strip()
            title = (p.get("title") or "").strip()
            provider = (p.get("provider") or "").strip()
            entry = f"- {ptype}: {title}" if ptype else f"- {title}"
            if provider:
                entry += f" ({provider})"
            lines.append(entry)
        parts.append("\n".join(lines))

    return "\n\n".join(parts)


@app.post("/api/cv-coach/generate-summary")
async def generate_summary_endpoint(
    request: GenerateSummaryRequest,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Generate a professional summary from full profile context (Ideas #55, #296)."""
    user_id = user_id or "default"
    if not WORKFLOW_AVAILABLE:
        raise HTTPException(status_code=503, detail="Workflow modules not available")

    backend_type = request.backend_type or _default_cloud_backend()
    backend_config = _build_backend_config(backend_type, request.model_name)

    backend = LLMBackendFactory.create_backend(backend_type, **backend_config)
    optimizer = ATSOptimizer(backend=backend)

    profile = profile_store.get_or_create_profile(user_id)
    job_history_records = profile_store.list_job_history(user_id)
    certifications = profile_store.list_certifications(user_id)
    skills = profile_store.list_skills(user_id)
    education = profile_store.list_education(user_id)
    pd_items = profile_store.list_professional_development(user_id)

    profile_context = _build_profile_context(
        profile, job_history_records, certifications, skills, education, pd_items
    )

    # Fall back to cv_text from request if profile has no content
    if not profile_context.strip() and request.cv_text.strip():
        profile_context = request.cv_text.strip()

    if not profile_context:
        raise HTTPException(status_code=400, detail="No profile content found — add work experience or skills first")

    scrub_result = pii_scrubber.scrub(profile_context, profile, job_history_records)

    generated_at = datetime.now().isoformat(timespec="seconds")
    model_label = backend_config.get("model_name", backend_type)

    loop = asyncio.get_event_loop()
    raw_summary, debug_prompt = await loop.run_in_executor(
        None,
        optimizer.generate_summary,
        scrub_result.scrubbed_text,
        request.job_description,
    )

    summary = pii_scrubber.restore(raw_summary, scrub_result.replacements)
    debug_header = (
        f"Generated: {generated_at}\n"
        f"Backend:   {backend_type}\n"
        f"Model:     {model_label}\n"
        f"{'─' * 60}\n"
    )
    return {"summary": summary, "debug_prompt": debug_header + debug_prompt}


# ============================================================================
# WebSocket Endpoint for Real-Time Job Progress
# ============================================================================

@app.websocket("/api/ws/jobs/{job_id}")
async def websocket_job_progress(websocket: WebSocket, job_id: str):
    """
    WebSocket endpoint for real-time job progress updates.

    Connect to this endpoint after creating a job to receive live updates
    instead of polling the REST API.
    """
    await ws_manager.connect(websocket, job_id)

    try:
        # Send current job status immediately on connection
        job = job_store.get_job(job_id)
        if job:
            await websocket.send_json(job)
        else:
            await websocket.send_json({"error": f"Job {job_id} not found"})

        # Keep connection alive and listen for client messages
        # (mainly just to detect disconnection)
        while True:
            try:
                # Wait for any message from client (ping/keep-alive)
                data = await websocket.receive_text()
                # Echo back current status if client sends "status"
                if data == "status":
                    job = job_store.get_job(job_id)
                    if job:
                        await websocket.send_json(job)
            except WebSocketDisconnect:
                break

    except WebSocketDisconnect:
        pass
    finally:
        ws_manager.disconnect(websocket, job_id)


# ============================================================================
# Candidate Profile Endpoints (Idea #233)
# ============================================================================

@app.get("/api/onboarding/status")
async def get_onboarding_status(user_id: str = Header(None, alias="X-User-ID")):
    """Return checklist of onboarding steps the user has completed (Epic #36)."""
    uid = user_id or "default"
    profile = profile_store.get_or_create_profile(uid)
    cvs = cv_store.list_cvs(uid)
    saved = job_store.list_jobs(user_id=uid, limit=1, outcome_status="saved")
    return {
        "has_profile": bool(profile.get("full_name")),
        "has_cv": len(cvs) > 0,
        "has_saved_job": len(saved) > 0,
    }


@app.get("/api/profile")
async def get_profile(user_id: str = Header(None, alias="X-User-ID")):
    """Get or create candidate profile for current user."""
    user_id = user_id or "default"
    return profile_store.get_or_create_profile(user_id)


@app.put("/api/profile")
async def update_profile(
    request: ProfileUpdate,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Update candidate personal info."""
    user_id = user_id or "default"
    # Ensure profile exists before updating
    profile_store.get_or_create_profile(user_id)
    return profile_store.update_profile(user_id, request.model_dump(exclude_none=True))


@app.get("/api/profile/job-history")
async def list_job_history(user_id: str = Header(None, alias="X-User-ID")):
    """List all job history records for current user."""
    user_id = user_id or "default"
    return profile_store.list_job_history(user_id)


@app.post("/api/profile/job-history", status_code=201)
async def create_job_history(
    request: JobHistoryCreate,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Create a new job history record."""
    user_id = user_id or "default"
    data = request.model_dump()
    return profile_store.create_job(user_id, data)


@app.put("/api/profile/job-history/reorder")
async def reorder_job_history(
    request: ReorderRequest,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Set display order for job history records."""
    user_id = user_id or "default"
    profile_store.reorder_jobs(user_id, request.ordered_ids)
    return {"status": "ok"}


@app.put("/api/profile/job-history/{job_id}")
async def update_job_history(
    job_id: int,
    request: JobHistoryUpdate,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Update a job history record."""
    user_id = user_id or "default"
    result = profile_store.update_job(job_id, user_id, request.model_dump(exclude_unset=True))
    if result is None:
        raise HTTPException(status_code=404, detail=f"Job history record {job_id} not found")
    return result


@app.delete("/api/profile/job-history/{job_id}")
async def delete_job_history(
    job_id: int,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Delete a job history record."""
    user_id = user_id or "default"
    deleted = profile_store.delete_job(job_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Job history record {job_id} not found")
    return {"status": "deleted"}


DEFAULT_SECTIONS = [
    {"key": "summary",                  "label": "Professional Summary"},
    {"key": "experience",               "label": "Work Experience"},
    {"key": "education",                "label": "Education"},
    {"key": "certifications",           "label": "Certifications"},
    {"key": "skills",                   "label": "Skills"},
    {"key": "professional_development", "label": "Professional Development"},
]


@app.get("/api/profile/assemble-cv")
async def assemble_cv(user_id: str = Header(None, alias="X-User-ID")):
    """Render structured profile data into CV section texts."""
    import json as _json
    user_id = user_id or "default"
    profile = profile_store.get_or_create_profile(user_id)
    job_history = profile_store.list_job_history(user_id)
    certifications = profile_store.list_certifications(user_id)
    skills = profile_store.list_skills(user_id)
    pd_items = profile_store.list_professional_development(user_id)
    education = profile_store.list_education(user_id)
    orgs = profile_store.list_orgs()
    grouping_mode = profile.get("cert_grouping_mode") or "flat"
    contact_header = cv_assembler.format_contact_header(profile)
    summary_text = cv_assembler.assemble_summary_section(profile)
    experience_text = cv_assembler.assemble_experience_section(job_history)
    education_text = cv_assembler.assemble_education_section(education)
    certifications_text = cv_assembler.assemble_certifications_section(certifications, orgs, grouping_mode)
    skills_text = cv_assembler.assemble_skills_section(skills)
    professional_development_text = cv_assembler.assemble_professional_development_section(pd_items)

    text_map = {
        "summary": summary_text,
        "experience": experience_text,
        "education": education_text,
        "certifications": certifications_text,
        "skills": skills_text,
        "professional_development": professional_development_text,
    }

    raw_config = profile.get("section_config")
    try:
        config = _json.loads(raw_config) if raw_config else DEFAULT_SECTIONS
    except (ValueError, TypeError):
        config = DEFAULT_SECTIONS

    sections = [
        {
            "key": s["key"],
            "label": s["label"],
            "text": text_map.get(s["key"], ""),
            "visible": s.get("visible", True),
        }
        for s in config
    ]

    return {
        "contact_header": contact_header,
        "summary_text": summary_text,
        "experience_text": experience_text,
        "education_text": education_text,
        "certifications_text": certifications_text,
        "skills_text": skills_text,
        "professional_development_text": professional_development_text,
        "sections": sections,
    }


# ── Issuing Organisations endpoints (Idea #281) ───────────────────────────────

@app.get("/api/profile/issuing-organisations")
async def list_issuing_organisations():
    """List all issuing organisations (global, not user-scoped)."""
    return profile_store.list_orgs()


@app.post("/api/profile/issuing-organisations", status_code=201)
async def create_issuing_organisation(request: IssuingOrgCreate):
    """Create a new issuing organisation."""
    return profile_store.create_org(request.model_dump())


@app.put("/api/profile/issuing-organisations/{org_id}")
async def update_issuing_organisation(org_id: int, request: IssuingOrgUpdate):
    """Update an issuing organisation."""
    result = profile_store.update_org(org_id, request.model_dump(exclude_unset=True))
    if result is None:
        raise HTTPException(status_code=404, detail=f"Organisation {org_id} not found")
    return result


@app.delete("/api/profile/issuing-organisations/{org_id}")
async def delete_issuing_organisation(org_id: int):
    """Delete an issuing organisation (only if no certs reference it)."""
    deleted = profile_store.delete_org(org_id)
    if not deleted:
        raise HTTPException(status_code=409, detail="Organisation is referenced by certifications and cannot be deleted")
    return {"status": "deleted"}


# ── Certifications endpoints ──────────────────────────────────────────────────

@app.get("/api/profile/certifications")
async def list_certifications(user_id: str = Header(None, alias="X-User-ID")):
    """List all certification records for current user."""
    user_id = user_id or "default"
    return profile_store.list_certifications(user_id)


@app.post("/api/profile/certifications", status_code=201)
async def create_certification(
    request: CertificationCreate,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Create a new certification record."""
    user_id = user_id or "default"
    return profile_store.create_certification(user_id, request.model_dump())


@app.put("/api/profile/certifications/reorder")
async def reorder_certifications(
    request: ReorderRequest,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Set display order for certification records."""
    user_id = user_id or "default"
    profile_store.reorder_certifications(user_id, request.ordered_ids)
    return {"status": "ok"}


@app.put("/api/profile/certifications/{cert_id}")
async def update_certification(
    cert_id: int,
    request: CertificationUpdate,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Update a certification record."""
    user_id = user_id or "default"
    result = profile_store.update_certification(cert_id, user_id, request.model_dump(exclude_unset=True))
    if result is None:
        raise HTTPException(status_code=404, detail=f"Certification {cert_id} not found")
    return result


@app.delete("/api/profile/certifications/{cert_id}")
async def delete_certification(
    cert_id: int,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Delete a certification record."""
    user_id = user_id or "default"
    deleted = profile_store.delete_certification(cert_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Certification {cert_id} not found")
    return {"status": "deleted"}


# ── Professional Development endpoints (Idea #243) ────────────────────────────

@app.get("/api/profile/professional-development")
async def list_professional_development(user_id: str = Header(None, alias="X-User-ID")):
    """List all professional development items for current user."""
    user_id = user_id or "default"
    return profile_store.list_professional_development(user_id)


@app.post("/api/profile/professional-development", status_code=201)
async def create_professional_development(
    request: ProfessionalDevelopmentCreate,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Create a new professional development item."""
    user_id = user_id or "default"
    return profile_store.create_professional_development(user_id, request.model_dump())


@app.put("/api/profile/professional-development/reorder")
async def reorder_professional_development(
    request: ReorderRequest,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Set display order for professional development items."""
    user_id = user_id or "default"
    profile_store.reorder_professional_development(user_id, request.ordered_ids)
    return {"status": "ok"}


@app.put("/api/profile/professional-development/{pd_id}")
async def update_professional_development(
    pd_id: int,
    request: ProfessionalDevelopmentUpdate,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Update a professional development item."""
    user_id = user_id or "default"
    result = profile_store.update_professional_development(pd_id, user_id, request.model_dump(exclude_unset=True))
    if result is None:
        raise HTTPException(status_code=404, detail=f"Professional development item {pd_id} not found")
    return result


@app.delete("/api/profile/professional-development/{pd_id}")
async def delete_professional_development(
    pd_id: int,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Delete a professional development item."""
    user_id = user_id or "default"
    deleted = profile_store.delete_professional_development(pd_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Professional development item {pd_id} not found")
    return {"status": "deleted"}


# ── Education endpoints ───────────────────────────────────────────────────────

@app.get("/api/profile/education")
async def list_education(user_id: str = Header(None, alias="X-User-ID")):
    """List all education records for current user."""
    user_id = user_id or "default"
    return profile_store.list_education(user_id)


@app.post("/api/profile/education", status_code=201)
async def create_education(
    request: EducationCreate,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Create a new education record."""
    user_id = user_id or "default"
    return profile_store.create_education(user_id, request.model_dump())


@app.put("/api/profile/education/reorder")
async def reorder_education(
    request: ReorderRequest,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Set display order for education records."""
    user_id = user_id or "default"
    profile_store.reorder_education(user_id, request.ordered_ids)
    return {"status": "ok"}


@app.put("/api/profile/education/{edu_id}")
async def update_education(
    edu_id: int,
    request: EducationUpdate,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Update an education record."""
    user_id = user_id or "default"
    result = profile_store.update_education(edu_id, user_id, request.model_dump(exclude_unset=True))
    if result is None:
        raise HTTPException(status_code=404, detail=f"Education record {edu_id} not found")
    return result


@app.delete("/api/profile/education/{edu_id}")
async def delete_education(
    edu_id: int,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Delete an education record."""
    user_id = user_id or "default"
    deleted = profile_store.delete_education(edu_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Education record {edu_id} not found")
    return {"status": "deleted"}


# ── Skills endpoints ──────────────────────────────────────────────────────────

@app.get("/api/profile/skills")
async def list_skills(user_id: str = Header(None, alias="X-User-ID")):
    """List all skill records for current user."""
    user_id = user_id or "default"
    return profile_store.list_skills(user_id)


@app.post("/api/profile/skills", status_code=201)
async def create_skill(
    request: SkillCreate,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Create a new skill record."""
    user_id = user_id or "default"
    return profile_store.create_skill(user_id, request.model_dump())


@app.put("/api/profile/skills/{skill_id}")
async def update_skill(
    skill_id: int,
    request: SkillUpdate,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Update a skill record."""
    user_id = user_id or "default"
    result = profile_store.update_skill(skill_id, user_id, request.model_dump(exclude_unset=True))
    if result is None:
        raise HTTPException(status_code=404, detail=f"Skill {skill_id} not found")
    return result


@app.delete("/api/profile/skills/{skill_id}")
async def delete_skill(
    skill_id: int,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Delete a skill record."""
    user_id = user_id or "default"
    deleted = profile_store.delete_skill(skill_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Skill {skill_id} not found")
    return {"status": "deleted"}


@app.post("/api/profile/sync-from-cv")
async def sync_from_cv(
    request: SyncFromCVRequest,
    user_id: str = Header(None, alias="X-User-ID"),
):
    """Parse JOB markers + optional summary from CV text and update profile."""
    user_id = user_id or "default"
    updates = cv_assembler.parse_experience_section(request.cv_text)
    updated_count = 0
    for update in updates:
        job_id = update["id"]
        # Verify this job belongs to the user before updating
        jobs = profile_store.list_job_history(user_id)
        job_ids = {j["id"] for j in jobs}
        if job_id in job_ids:
            profile_store.update_job_details(job_id, update["details"], update["tags"])
            updated_count += 1

    summary_updated = False
    if request.sync_summary:
        summary_text = cv_assembler.parse_summary_section(request.cv_text)
        if summary_text:
            profile_store.update_profile(user_id, summary=summary_text)
            summary_updated = True

    return {"updated_count": updated_count, "summary_updated": summary_updated}


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║     Job Application Workflow - FastAPI Backend               ║
║     Track 2: Local Web UI                                    ║
╚══════════════════════════════════════════════════════════════╝

Starting server at http://localhost:8000
API docs available at http://localhost:8000/docs

Directories:
  - Project Root: {PROJECT_ROOT}
  - Source:       {SRC_DIR}
  - Inputs:       {settings.INPUTS_DIR}
  - Outputs:      {settings.OUTPUTS_DIR}
  - Uploads:      {settings.UPLOADS_DIR}

Workflow Available: {WORKFLOW_AVAILABLE}
""")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True  # Enable auto-reload for development
    )
