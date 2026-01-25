#!/usr/bin/env python3
"""
FastAPI Backend for Job Application Workflow
Track 2: Local Web UI - Week 1

This provides a REST API for the existing job application workflow,
enabling a web-based interface while keeping everything local.
"""

import os
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
load_dotenv(Path(__file__).parent.parent / ".env")

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


# Import from job_store module
# Handle both direct run and uvicorn import contexts
try:
    from job_store import JobStore, JobStatus, CVStore, OutcomeStatus, UserStore
except ImportError:
    from backend.job_store import JobStore, JobStatus, CVStore, OutcomeStatus, UserStore


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
    backend: str
    timestamp: str
    ats_score: Optional[float]
    status: JobStatus
    output_dir: str


class OutcomeUpdateRequest(BaseModel):
    """Request to update job application outcome"""
    outcome_status: str  # draft, submitted, response, interview, offer, rejected, withdrawn
    notes: Optional[str] = None


class MetricsResponse(BaseModel):
    """Application funnel metrics"""
    total: int
    by_status: Dict[str, int]
    funnel: Dict[str, int]
    rates: Dict[str, float]
    avg_time_to_response_days: Optional[float]


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


async def process_job_application(
    job_id: str,
    cv_path: str,
    job_desc_path: str,
    company_name: Optional[str],
    enable_ats: bool,
    backend_type: str,
    backend_config: dict,
    custom_questions: Optional[str] = None
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
            
            await update_job_and_broadcast(
                job_id,
                progress=40,
                current_step="Generating ATS-optimized CV",
                message=f"ATS Score: {ats_score['score']}% - Generating optimized CV...",
                ats_score=ats_score['score']
            )
            await asyncio.sleep(0.1)
            
            tailored_cv = ats_optimizer.generate_ats_optimized_cv(
                base_cv, job_description, key_requirements
            )
        else:
            await update_job_and_broadcast(
                job_id,
                progress=40,
                current_step="Generating tailored CV",
                message="Creating customized CV..."
            )
            await asyncio.sleep(0.1)
            
            tailored_cv = workflow.tailor_cv(base_cv, job_description)
        
        await update_job_and_broadcast(
            job_id,
            progress=60,
            current_step="Generating cover letter",
            message="Writing personalized cover letter..."
        )
        await asyncio.sleep(0.1)
        
        cover_letter = workflow.generate_cover_letter(
            base_cv, job_description, company_name or "the company"
        )
        
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
            
            answers = workflow.answer_application_questions(
                base_cv, job_description, custom_questions
            )
        
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
        "gemini": False
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
        }
    ]
    return BackendListResponse(backends=backends)


@app.post("/api/jobs", response_model=JobResponse)
async def create_job(
    background_tasks: BackgroundTasks,
    cv_file: Optional[UploadFile] = File(None),
    job_desc_file: UploadFile = File(...),
    cv_id: Optional[int] = Form(None),
    company_name: Optional[str] = Form(None),
    enable_ats: bool = Form(True),
    backend_type: str = Form("ollama"),
    backend_model: Optional[str] = Form(None),
    custom_questions: Optional[str] = Form(None),
    user_id: str = Header(None, alias="X-User-ID"),
):
    """
    Create a new job application processing task.

    Provide CV either by uploading cv_file OR by specifying cv_id (stored CV).
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

    # Must provide either cv_file or cv_id
    if not cv_file and not cv_id:
        raise HTTPException(
            status_code=400,
            detail="Must provide either cv_file (upload) or cv_id (stored CV)"
        )

    # Generate unique job ID
    job_id = str(uuid.uuid4())[:8]

    # Create job in store with user_id
    job_store.create_job(job_id, user_id=user_id)

    try:
        # Handle CV - either from upload or from stored CV
        if cv_file:
            # Use uploaded file
            cv_path = settings.UPLOADS_DIR / f"{job_id}_cv{Path(cv_file.filename).suffix}"
            with open(cv_path, "wb") as f:
                content = await cv_file.read()
                f.write(content)
        else:
            # Use stored CV (verify user ownership)
            cv_content = cv_store.get_cv_content(cv_id, user_id=user_id)
            if not cv_content:
                raise HTTPException(status_code=404, detail=f"CV {cv_id} not found")
            cv_path = settings.UPLOADS_DIR / f"{job_id}_cv.txt"
            with open(cv_path, "w", encoding="utf-8") as f:
                f.write(cv_content)

        # Save job description file
        job_desc_path = settings.UPLOADS_DIR / f"{job_id}_job{Path(job_desc_file.filename).suffix}"
        with open(job_desc_path, "wb") as f:
            content = await job_desc_file.read()
            f.write(content)
        
        # Build backend config
        backend_config = {}
        if backend_type == "ollama":
            backend_config["model_name"] = backend_model or "llama3.1:8b"
        elif backend_type == "llamacpp":
            backend_config["model_name"] = backend_model or "gemma-3-27B"
            backend_config["base_url"] = "http://localhost:8080"
        elif backend_type == "gemini":
            backend_config["model_name"] = backend_model or "gemini-2.0-flash"
            backend_config["api_key"] = os.environ.get("GEMINI_API_KEY")
        
        # Update job with file paths
        job_store.update_job(
            job_id,
            cv_path=str(cv_path),
            job_desc_path=str(job_desc_path),
            company_name=company_name,
            backend_type=backend_type
        )
        
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
            custom_questions=custom_questions
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
        error=job["error"]
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

                # Merge outcome data from database
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
    }


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
