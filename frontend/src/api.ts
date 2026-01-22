import type { Backend, Job, JobCreate, OutputFile, Application, HealthStatus } from './types';

const API_BASE = '/api';

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
    backend: data.backend_type || data.backend || '',
    model: data.backend_model || data.model,
    enable_ats: data.enable_ats ?? true,
    created_at: data.created_at || '',
    completed_at: data.completed_at,
    output_dir: data.output_dir,
    ats_score: data.ats_score,
    error: data.error,
  };
}

export async function createJob(data: JobCreate): Promise<Job> {
  const formData = new FormData();
  // Field names must match backend: cv_file, job_desc_file, backend_type, backend_model
  formData.append('cv_file', data.cv_file);
  formData.append('job_desc_file', data.job_file);  // Backend expects "job_desc_file"
  formData.append('backend_type', data.backend);     // Backend expects "backend_type"
  
  if (data.company_name) {
    formData.append('company_name', data.company_name);
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
    body: formData,
  });
  const rawJob = await handleResponse<any>(response);
  return normalizeJob(rawJob);
}

export async function getJobs(): Promise<Job[]> {
  const response = await fetch(`${API_BASE}/jobs`);
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

// Applications (past outputs)
export async function getApplications(): Promise<Application[]> {
  const response = await fetch(`${API_BASE}/applications`);
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

export { ApiError };
