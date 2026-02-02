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
  version_number?: number;  // Current version number
  current_version_id?: number;
  version_count?: number;
}

export interface CVVersion {
  id: number;
  cv_id: number;
  version_number: number;
  filename: string;
  content?: string;  // Only when fetching single version
  change_summary?: string;
  created_at: string;
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
  // CV version tracking
  cv_version_id?: number;
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

export interface JobDescription {
  job_id: string;
  description: string | null;
  source: 'database' | 'file' | null;
  message?: string;
}

// ============================================================================
// ATS Analysis Types (Track 2.9.2)
// ============================================================================

export interface ATSCategoryScore {
  matched: number;
  missing: number;
  items_matched: string[];
  items_missing: string[];
}

export interface HybridScoring {
  final_score: number;
  lexical_score: number;
  lexical_weight: number;
  lexical_contribution: number;
  semantic_score: number;
  semantic_weight: number;
  semantic_contribution: number;
  evidence_score: number;
  evidence_weight: number;
  evidence_contribution: number;
  semantic_available: boolean;
}

export interface SemanticMatch {
  jd_section: string;
  cv_section: string;
  similarity: number;
  is_high_value: boolean;
}

export interface SemanticAnalysis {
  available: boolean;
  score: number;
  section_similarities: Record<string, number>;
  top_matches: SemanticMatch[];
  gaps: string[];
  entity_support_ratio: number;
  high_value_match_count: number;
}

export interface EvidenceAnalysis {
  strong_evidence_count: number;
  moderate_evidence_count: number;
  weak_evidence_count: number;
  average_strength: number;
  strong_skills: string[];
  weak_skills: string[];
}

export interface ParsedEntities {
  cv_hard_skills: string[];
  cv_soft_skills: string[];
  jd_required_skills: string[];
  jd_preferred_skills: string[];
  cv_years_experience: number | null;
  jd_years_required: number | null;
}

export interface SectionAnalysis {
  experience_matches: string[];
  skills_matches: string[];
  projects_matches: string[];
  not_found_in_cv: string[];
  cv_sections_detected: number;
  jd_sections_detected: number;
}

export interface ATSAnalysisData {
  score: number;
  matched: number;
  total: number;
  missing_keywords: string[];
  matched_keywords: string[];
  top_job_keywords: string[];
  scores_by_category: Record<string, ATSCategoryScore>;
  matched_phrases: string[];
  missing_phrases: string[];
  section_analysis: SectionAnalysis;
  evidence_analysis: EvidenceAnalysis;
  parsed_entities: ParsedEntities;
  hybrid_scoring: HybridScoring;
  semantic_analysis: SemanticAnalysis;
}

export interface ATSAnalysisResponse {
  job_id: string;
  ats_score: number | null;
  analysis: ATSAnalysisData | null;
  source: 'database' | null;
  message?: string;
}

export interface RematchResponse {
  job_id: string;
  old_score: number | null;
  new_score: number;
  delta: number;
  ats_details: ATSAnalysisData;
  cv_version_id: number;
}

export interface CategoryComparison {
  category: string;
  oldMatched: number;
  oldMissing: number;
  newMatched: number;
  newMissing: number;
  delta: number;
  keywordsNowMatched: string[];
  keywordsStillMissing: string[];
  keywordsNewlyMissing: string[];
}

export interface ATSComparisonData {
  oldScore: number | null;
  newScore: number;
  delta: number;
  categories: CategoryComparison[];
  keywordsAddressed: string[];
  keywordsStillMissing: string[];
}

// Match History (Idea #121)
export interface MatchHistoryEntry {
  id: number;
  job_id: string;
  cv_version_id: number | null;
  score: number;
  matched: number | null;
  total: number | null;
  missing_count: number | null;
  created_at: string;
  version_number: number | null;
  change_summary: string | null;
  iteration: number;
  delta: number | null;
}

export interface MatchHistoryResponse {
  job_id: string;
  history: MatchHistoryEntry[];
}
