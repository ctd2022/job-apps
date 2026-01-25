// Types matching the FastAPI backend

// Outcome status for application tracking
export type OutcomeStatus =
  | 'draft'
  | 'submitted'
  | 'response'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

export interface Backend {
  id: string;
  name: string;
  available: boolean;
  description: string;
  default_model?: string;
  models?: string[];
}

export interface JobCreate {
  cv_file?: File;
  cv_id?: number;
  job_file: File;
  company_name?: string;
  job_title?: string;
  backend: string;
  model?: string;
  enable_ats?: boolean;
  questions?: string;
}

export interface StoredCV {
  id: number;
  name: string;
  filename: string;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
  content?: string;  // Only included when fetching single CV
}

export interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  company_name?: string;
  job_title?: string;
  backend: string;
  model?: string;
  enable_ats: boolean;
  created_at: string;
  completed_at?: string;
  output_dir?: string;
  ats_score?: number;
  error?: string;
  // Outcome tracking fields
  outcome_status: OutcomeStatus;
  submitted_at?: string;
  response_at?: string;
  outcome_at?: string;
  notes?: string;
}

export interface OutputFile {
  name: string;
  size: number;
  type: string;
}

export interface Application {
  folder_name: string;
  job_id: string;
  job_name: string;
  backend: string;
  model?: string;
  timestamp: string;
  ats_score?: number;
  company_name?: string;
  job_title?: string;
  files: string[];
  output_dir?: string;
  // Outcome tracking fields
  outcome_status: OutcomeStatus;
  submitted_at?: string;
  response_at?: string;
  outcome_at?: string;
  notes?: string;
}

export interface OutcomeUpdate {
  outcome_status: OutcomeStatus;
  notes?: string;
}

export interface Metrics {
  total: number;
  by_status: Record<string, number>;
  funnel: {
    draft: number;
    submitted: number;
    response: number;
    interview: number;
    offer: number;
  };
  rates: {
    response_rate: number;
    interview_rate: number;
    offer_rate: number;
  };
  avg_time_to_response_days: number | null;
}

export interface HealthStatus {
  status: string;
  version: string;
  backends: {
    ollama: boolean;
    llamacpp: boolean;
    gemini: boolean;
  };
}

export interface User {
  id: string;
  name: string;
  created_at: string;
}
