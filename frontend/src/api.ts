import type { Backend, Job, JobCreate, OutputFile, Application, HealthStatus, StoredCV, CVVersion, OutcomeUpdate, Metrics, OutcomeStatus, User, JobDescription, ATSAnalysisResponse, RematchResponse, MatchHistoryResponse, ApplySuggestionsResponse } from './types';

const API_BASE = '/api';

// ============================================================================
// User State Management
// ============================================================================

let currentUserId: string | null = null;

export function setCurrentUser(userId: string): void {
  currentUserId = userId;
  localStorage.setItem('userId', userId);
}

export function getCurrentUser(): string {
  if (!currentUserId) {
    currentUserId = localStorage.getItem('userId') || 'default';
  }
  return currentUserId;
}

export function clearCurrentUser(): void {
  currentUserId = null;
  localStorage.removeItem('userId');
}

function getUserHeaders(): HeadersInit {
  return { 'X-User-ID': getCurrentUser() };
}

// ============================================================================
// API Client
// ============================================================================

class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.detail || `HTTP error ${response.status}`,
      response.status
    );
  }
  return response.json();
}

// Health & Status
export async function getHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE}/health`);
  return handleResponse(response);
}

// User Management
export async function getUsers(): Promise<User[]> {
  const response = await fetch(`${API_BASE}/users`);
  const data = await handleResponse<any>(response);
  return data?.users || data || [];
}

export async function createUser(name: string): Promise<User> {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return handleResponse(response);
}

export async function getUser(userId: string): Promise<User> {
  const response = await fetch(`${API_BASE}/users/${userId}`);
  return handleResponse(response);
}

// Backends
export async function getBackends(): Promise<Backend[]> {
  const response = await fetch(`${API_BASE}/backends`);
  return handleResponse(response);
}

// Jobs
// Normalize backend response (job_id -> id, current_step -> stage)
function normalizeJob(data: any): Job {
  return {
    id: data.job_id || data.id,
    status: data.status,
    progress: data.progress || 0,
    stage: data.current_step || data.stage || '',
    company_name: data.company_name,
    job_title: data.job_title,
    backend: data.backend_type || data.backend || '',
    model: data.backend_model || data.model,
    enable_ats: data.enable_ats ?? true,
    created_at: data.created_at || '',
    completed_at: data.completed_at,
    output_dir: data.output_dir,
    ats_score: data.ats_score,
    error: data.error,
    // Outcome tracking fields
    outcome_status: data.outcome_status || 'draft',
    submitted_at: data.submitted_at,
    response_at: data.response_at,
    outcome_at: data.outcome_at,
    notes: data.notes,
    // CV version tracking
    cv_version_id: data.cv_version_id,
  };
}

// Normalize application from backend
function normalizeApplication(data: any): Application {
  return {
    folder_name: data.folder_name || data.output_dir?.split('/').pop() || '',
    job_id: data.job_id || '',
    job_name: data.job_name || '',
    backend: data.backend || 'unknown',
    model: data.model || data.backend_model,
    timestamp: data.timestamp || '',
    ats_score: data.ats_score,
    company_name: data.company_name,
    job_title: data.job_title,
    files: data.files || [],
    output_dir: data.output_dir,
    // Outcome tracking fields
    outcome_status: data.outcome_status || 'draft',
    submitted_at: data.submitted_at,
    response_at: data.response_at,
    outcome_at: data.outcome_at,
    notes: data.notes,
  };
}

export async function createJob(data: JobCreate): Promise<Job> {
  const formData = new FormData();

  // CV: either upload file OR use stored CV ID
  if (data.cv_file) {
    formData.append('cv_file', data.cv_file);
  } else if (data.cv_id !== undefined) {
    formData.append('cv_id', String(data.cv_id));
  }

  // Job description (always required)
  formData.append('job_desc_file', data.job_file);  // Backend expects "job_desc_file"
  formData.append('backend_type', data.backend);     // Backend expects "backend_type"

  if (data.company_name) {
    formData.append('company_name', data.company_name);
  }
  if (data.job_title) {
    formData.append('job_title', data.job_title);
  }
  if (data.model) {
    formData.append('backend_model', data.model);    // Backend expects "backend_model"
  }
  if (data.enable_ats !== undefined) {
    formData.append('enable_ats', String(data.enable_ats));
  }
  if (data.questions) {
    formData.append('custom_questions', data.questions);  // Backend expects "custom_questions"
  }

  const response = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: getUserHeaders(),
    body: formData,
  });
  const rawJob = await handleResponse<any>(response);
  return normalizeJob(rawJob);
}

export async function getJobs(): Promise<Job[]> {
  const response = await fetch(`${API_BASE}/jobs`, {
    headers: getUserHeaders(),
  });
  return handleResponse(response);
}

export async function getJob(id: string): Promise<Job> {
  const response = await fetch(`${API_BASE}/jobs/${id}`);
  const rawJob = await handleResponse<any>(response);
  return normalizeJob(rawJob);
}

export async function deleteJob(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/jobs/${id}`, {
    method: 'DELETE',
    headers: getUserHeaders(),
  });
  if (!response.ok) {
    throw new ApiError('Failed to delete job', response.status);
  }
}

export async function getJobFiles(id: string): Promise<OutputFile[]> {
  const response = await fetch(`${API_BASE}/jobs/${id}/files`);
  const data = await handleResponse<any>(response);
  // Normalize: backend sends {files: [...]} with 'filename', frontend expects 'name'
  const files = data?.files || data || [];
  return files.map((f: any) => ({
    name: f.filename || f.name,
    size: f.size || 0,
    type: f.type || 'other',
  }));
}

export function getJobFileUrl(jobId: string, fileName: string): string {
  return `${API_BASE}/jobs/${jobId}/files/${fileName}`;
}

export interface FileContent {
  filename: string;
  content: string;
  type: 'markdown' | 'json' | 'text';
}

export async function getJobFileContent(jobId: string, fileName: string): Promise<FileContent> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}/files/${fileName}/content`);
  return handleResponse(response);
}

export async function getJobDescription(jobId: string): Promise<JobDescription> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}/description`);
  return handleResponse(response);
}

// ATS Analysis (Track 2.9.2)
export async function getATSAnalysis(jobId: string): Promise<ATSAnalysisResponse> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}/ats-analysis`);
  return handleResponse(response);
}

export async function rematchATS(
  jobId: string,
  cvVersionId: number,
): Promise<RematchResponse> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}/rematch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getUserHeaders() },
    body: JSON.stringify({ cv_version_id: cvVersionId }),
  });
  return handleResponse(response);
}

// Apply Suggestions (Idea #122) — LLM incorporates keywords into CV
export async function applySuggestions(
  jobId: string,
  cvVersionId: number,
  selectedKeywords: string[],
  weakSkills?: string[],
  backendType?: string,
  modelName?: string,
): Promise<ApplySuggestionsResponse> {
  const body: Record<string, unknown> = {
    cv_version_id: cvVersionId,
    selected_keywords: selectedKeywords,
  };
  if (weakSkills?.length) {
    body.weak_skills = weakSkills;
  }
  if (backendType) {
    body.backend_type = backendType;
  }
  if (modelName) {
    body.model_name = modelName;
  }
  const response = await fetch(`${API_BASE}/jobs/${jobId}/apply-suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getUserHeaders() },
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

// Match History (Idea #121)
export async function getMatchHistory(jobId: string): Promise<MatchHistoryResponse> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}/match-history`, {
    headers: getUserHeaders(),
  });
  return handleResponse(response);
}

// Applications (past outputs)
export async function getApplications(outcomeStatus?: OutcomeStatus): Promise<Application[]> {
  const url = outcomeStatus
    ? `${API_BASE}/applications?outcome_status=${outcomeStatus}`
    : `${API_BASE}/applications`;
  const response = await fetch(url, {
    headers: getUserHeaders(),
  });
  const data = await handleResponse<any>(response);
  const apps = data?.applications || data || [];
  return apps.map(normalizeApplication);
}

// Outcome Tracking
export async function updateJobOutcome(
  jobId: string,
  update: OutcomeUpdate
): Promise<Job> {
  const response = await fetch(`${API_BASE}/jobs/${jobId}/outcome`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getUserHeaders() },
    body: JSON.stringify(update),
  });
  const data = await handleResponse<any>(response);
  return normalizeJob(data);
}

// Metrics
export async function getMetrics(): Promise<Metrics> {
  const response = await fetch(`${API_BASE}/metrics`, {
    headers: getUserHeaders(),
  });
  return handleResponse(response);
}

// Utility: Poll job status until complete (fallback for when WebSocket fails)
export async function pollJobUntilComplete(
  jobId: string,
  onProgress?: (job: Job) => void,
  intervalMs: number = 2000
): Promise<Job> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const job = await getJob(jobId);

        if (onProgress) {
          onProgress(job);
        }

        if (job.status === 'completed') {
          resolve(job);
        } else if (job.status === 'failed') {
          reject(new Error(job.error || 'Job failed'));
        } else {
          setTimeout(poll, intervalMs);
        }
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
}

// WebSocket: Subscribe to real-time job progress updates
export function subscribeToJobProgress(
  jobId: string,
  onProgress: (job: Job) => void,
  onComplete: (job: Job) => void,
  onError: (error: Error) => void
): () => void {
  // Determine WebSocket URL based on current location
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = window.location.host;
  const wsUrl = `${wsProtocol}//${wsHost}/api/ws/jobs/${jobId}`;

  console.log(`Connecting to WebSocket: ${wsUrl}`);
  const ws = new WebSocket(wsUrl);

  let isCompleted = false;

  ws.onopen = () => {
    console.log(`WebSocket connected for job ${jobId}`);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      // Check for error response
      if (data.error) {
        onError(new Error(data.error));
        ws.close();
        return;
      }

      // Normalize the job data
      const job = normalizeJob(data);
      onProgress(job);

      if (job.status === 'completed') {
        isCompleted = true;
        onComplete(job);
        ws.close();
      } else if (job.status === 'failed') {
        onError(new Error(job.error || 'Job failed'));
        ws.close();
      }
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
    }
  };

  ws.onerror = (event) => {
    console.error('WebSocket error:', event);
    if (!isCompleted) {
      onError(new Error('WebSocket connection error'));
    }
  };

  ws.onclose = (event) => {
    console.log(`WebSocket closed for job ${jobId}:`, event.code, event.reason);
  };

  // Return cleanup function
  return () => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  };
}

// Utility: Subscribe to job with automatic fallback to polling
export function subscribeToJobWithFallback(
  jobId: string,
  onProgress: (job: Job) => void,
  onComplete: (job: Job) => void,
  onError: (error: Error) => void
): () => void {
  let cleanup: (() => void) | null = null;
  let fallbackToPolling = false;

  // Try WebSocket first
  const wsCleanup = subscribeToJobProgress(
    jobId,
    onProgress,
    onComplete,
    (error) => {
      // If WebSocket fails and we haven't fallen back yet, try polling
      if (!fallbackToPolling) {
        fallbackToPolling = true;
        console.log('WebSocket failed, falling back to polling:', error.message);

        // Start polling
        pollJobUntilComplete(jobId, onProgress)
          .then(onComplete)
          .catch(onError);
      } else {
        onError(error);
      }
    }
  );

  cleanup = wsCleanup;

  return () => {
    if (cleanup) {
      cleanup();
    }
  };
}

// ============================================================================
// CV Management
// ============================================================================

export async function getCVs(): Promise<StoredCV[]> {
  const response = await fetch(`${API_BASE}/cvs`, {
    headers: getUserHeaders(),
  });
  const data = await handleResponse<any>(response);
  return data?.cvs || data || [];
}

export async function getCV(id: number): Promise<StoredCV> {
  const response = await fetch(`${API_BASE}/cvs/${id}`, {
    headers: getUserHeaders(),
  });
  return handleResponse(response);
}

export async function createCV(
  file: File,
  name: string,
  isDefault: boolean = false
): Promise<StoredCV> {
  const formData = new FormData();
  formData.append('cv_file', file);
  formData.append('name', name);
  formData.append('is_default', String(isDefault));

  const response = await fetch(`${API_BASE}/cvs`, {
    method: 'POST',
    headers: getUserHeaders(),
    body: formData,
  });
  return handleResponse(response);
}

export async function deleteCV(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/cvs/${id}`, {
    method: 'DELETE',
    headers: getUserHeaders(),
  });
  if (!response.ok) {
    throw new ApiError('Failed to delete CV', response.status);
  }
}

export async function setDefaultCV(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/cvs/${id}/default`, {
    method: 'PUT',
    headers: getUserHeaders(),
  });
  if (!response.ok) {
    throw new ApiError('Failed to set default CV', response.status);
  }
}

// CV Version endpoints (Track 2.9.3)

export async function getCVVersions(cvId: number): Promise<CVVersion[]> {
  const response = await fetch(`${API_BASE}/cvs/${cvId}/versions`, {
    headers: getUserHeaders(),
  });
  const data = await handleResponse<any>(response);
  return data?.versions || [];
}

export async function getCVVersion(cvId: number, versionId: number): Promise<CVVersion> {
  const response = await fetch(`${API_BASE}/cvs/${cvId}/versions/${versionId}`, {
    headers: getUserHeaders(),
  });
  return handleResponse(response);
}

export async function getCVVersionById(versionId: number): Promise<CVVersion> {
  const response = await fetch(`${API_BASE}/cv-versions/${versionId}`, {
    headers: getUserHeaders(),
  });
  return handleResponse(response);
}

export async function updateCVContent(
  cvId: number,
  update: { content: string; change_summary?: string }
): Promise<StoredCV> {
  const response = await fetch(`${API_BASE}/cvs/${cvId}/content`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getUserHeaders() },
    body: JSON.stringify(update),
  });
  return handleResponse(response);
}

export { ApiError };

// ============================================================================
// Theme Management
// ============================================================================

export type Theme = 'light' | 'dark';

export function getTheme(): Theme {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  // Default to system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
  localStorage.setItem('theme', theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function initTheme(): Theme {
  const theme = getTheme();
  setTheme(theme);
  return theme;
}
