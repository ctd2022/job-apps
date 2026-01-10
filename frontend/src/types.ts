// Types matching the FastAPI backend

export interface Backend {
  id: string;
  name: string;
  available: boolean;
  description: string;
  default_model?: string;
  models?: string[];
}

export interface JobCreate {
  cv_file: File;
  job_file: File;
  company_name?: string;
  backend: string;
  model?: string;
  enable_ats?: boolean;
  questions?: string;
}

export interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  company_name?: string;
  backend: string;
  model?: string;
  enable_ats: boolean;
  created_at: string;
  completed_at?: string;
  output_dir?: string;
  ats_score?: number;
  error?: string;
}

export interface OutputFile {
  name: string;
  size: number;
  type: string;
}

export interface Application {
  folder_name: string;
  job_name: string;
  backend: string;
  timestamp: string;
  ats_score?: number;
  company_name?: string;
  files: string[];
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
