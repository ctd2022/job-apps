// Types matching the FastAPI backend

// Outcome status for application tracking
export type OutcomeStatus =
  | 'saved'
  | 'draft'
  | 'submitted'
  | 'response'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

// Wishlist job quick-add (Idea #491)
export interface SavedJobCreate {
  job_title: string;
  company_name: string;
  listing_url?: string;
  job_description_text?: string;
  salary?: string;
  employment_type?: string;
}

export interface SavedJob {
  job_id: string;
  job_title: string;
  company_name: string;
  listing_url?: string | null;
  job_description_text?: string | null;
  salary?: string | null;
  employment_type?: string | null;
  created_at: string;
}

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
  use_profile?: boolean;
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
  employment_type?: string | null;
  salary?: string | null;
  listing_url?: string | null;
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
  employment_type?: string | null;
  salary?: string | null;
  listing_url?: string | null;
  // Position profiling corpus flag (Idea #242)
  include_in_profile?: boolean;
}

export interface HealthStatus {
  status: string;
  version: string;
  backends: {
    ollama: boolean;
    llamacpp: boolean;
    gemini: boolean;
    mistral: boolean;
  };
  workflow_available: boolean;
}

export interface OutcomeUpdate {
  outcome_status: OutcomeStatus;
  notes?: string;
}

export interface JobMetadataUpdate {
  employment_type?: string | null;
  salary?: string | null;
  listing_url?: string | null;
}

export interface Metrics {
  total: number;
  by_status: Record<string, number>;
  funnel: Record<string, number>;
  rates: {
    response_rate: number;
    interview_rate: number;
    offer_rate: number;
  };
  avg_time_to_response_days: number | null;
}

export interface PipelineDiagnosis {
  diagnosis: string;
  advice: string;
  metrics: {
    total_submitted: number;
    interview_rate: number;
    offer_rate: number;
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

export interface CriticalGaps {
  missing_critical_keywords: string[];
  missing_required_skills: string[];
}

export interface EvidenceGaps {
  weak_evidence_skills: string[];
}

export interface SemanticGaps {
  missing_concepts: string[];
}

export interface ExperienceGaps {
  cv_years: number | null;
  jd_years: number | null;
  gap: number;
  cv_years_source?: 'profile' | 'cv_text';
  experience_match?: boolean;
}

// Idea #87: Smart CV Gap Analysis with Actionable Suggestions
export interface ActionableSuggestion {
  skill: string;
  priority: 'critical' | 'required' | 'hard_skills' | 'preferred';  // mapped from category weight
  recommended_section: string;
  section_score: number;
  reason: string;
}

export interface GapAnalysis {
  critical_gaps: CriticalGaps;
  evidence_gaps: EvidenceGaps;
  semantic_gaps: SemanticGaps;
  experience_gaps: ExperienceGaps;
  actionable_suggestions?: ActionableSuggestion[];
}

// Idea #78: Evidence gap enrichment — section badges + specific advice per weak-evidence skill
export interface EvidenceGapDetail {
  skill: string;
  found_in: string[];  // e.g. ["skills"], ["experience", "skills"]
  advice: string;
}

// Idea #100: Keyword placement suggestions — surface real experience that is buried/underselling
export interface PlacementSuggestion {
  type: 'skills_only' | 'projects_not_experience' | 'weak_evidence';
  priority: 'high' | 'medium' | 'low';
  skill: string;
  message: string;
  section_hint: string;
}

// Idea #24: Per-criterion breakdown with keyword drill-down
export interface KeywordWithFrequency {
  keyword: string;
  jd_frequency: number;
}

export interface CriterionBreakdown {
  category: string;
  display_name: string;
  score: number;
  matched: number;
  total: number;
  explanation: string;
  matched_keywords: KeywordWithFrequency[];
  missing_keywords: KeywordWithFrequency[];
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
  jd_keyword_frequency?: Record<string, number>;  // idea #57
  criterion_breakdown?: CriterionBreakdown[];  // idea #24
  section_analysis: SectionAnalysis;
  evidence_analysis: EvidenceAnalysis;
  parsed_entities: ParsedEntities;
  hybrid_scoring: HybridScoring;
  semantic_analysis: SemanticAnalysis;
  gap_analysis?: GapAnalysis;
  keyword_placement?: PlacementSuggestion[];
  evidence_gap_details?: EvidenceGapDetail[];
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

export interface ApplySuggestionsResponse {
  job_id: string;
  revised_cv: string;
  applied_count: number;
  cv_version_id: number;
  backend_type: string;
  model_name: string;
  changelog: string;
}

// Gap-Fill Wizard types (Idea #82)
export interface GapQuestion {
  id: string;
  gap_type: 'critical' | 'evidence' | 'semantic';
  skill: string;
  question: string;
  section_hint: string;
}

export interface GapAnswer {
  skill: string;
  gap_type: string;
  user_content: string;
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

// Idea #233: Candidate Profile + PII Privacy Layer
export interface CandidateProfile {
  id: number;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  website: string | null;
  headline: string | null;
  cert_grouping_mode: 'flat' | 'by_org' | null;
  summary: string | null;
  section_config: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobHistoryRecord {
  id: number;
  user_id: string;
  employer: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  details: string | null;
  display_order: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Partial<Omit<CandidateProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type JobHistoryCreate = Omit<JobHistoryRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type JobHistoryUpdate = Partial<JobHistoryCreate>;

// Issuing Organisations (Idea #281)
export interface IssuingOrganisation {
  id: number;
  name: string;
  display_label: string | null;
  colour: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}
export type IssuingOrgCreate = Omit<IssuingOrganisation, 'id' | 'created_at' | 'updated_at'>;
export type IssuingOrgUpdate = Partial<IssuingOrgCreate>;

// Certifications (new section)
export interface Certification {
  id: number;
  user_id: string;
  name: string;
  issuing_org: string;
  issuing_org_id: number | null;
  org_colour: string | null;
  org_display_label: string | null;
  date_obtained: string | null;
  no_expiry: boolean;
  expiry_date: string | null;
  credential_id: string | null;
  credential_url: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}
export type CertificationCreate = Omit<Certification, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'org_colour' | 'org_display_label'>;
export type CertificationUpdate = Partial<CertificationCreate>;

// Skills (new section)
export interface Skill {
  id: number;
  user_id: string;
  name: string;
  category: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}
export type SkillCreate = Omit<Skill, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type SkillUpdate = Partial<SkillCreate>;

// Professional Development (Idea #243)
export type PDType =
  | 'Certification'
  | 'Course / Training'
  | 'Degree / Qualification'
  | 'Professional Membership'
  | 'Conference / Event'
  | 'Self-directed';

export type PDStatus = 'In Progress' | 'Studying' | 'Paused' | 'Completed' | 'Ongoing';

export interface ProfessionalDevelopment {
  id: number;
  user_id: string;
  type: PDType;
  title: string;
  provider: string | null;
  status: PDStatus;
  start_date: string | null;
  target_completion: string | null;
  completed_date: string | null;
  leads_to_credential: boolean;
  credential_url: string | null;
  show_on_cv: boolean;
  notes: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type ProfessionalDevelopmentCreate = Omit<ProfessionalDevelopment, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type ProfessionalDevelopmentUpdate = Partial<ProfessionalDevelopmentCreate>;

// Education
export interface Education {
  id: number;
  user_id: string;
  institution: string;
  qualification: string;
  grade: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}
export type EducationCreate = Omit<Education, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type EducationUpdate = Partial<EducationCreate>;

// Section ordering/visibility config
export interface SectionConfig {
  key: string;
  label: string;
  visible: boolean;
}

// Idea #229: CV Coach
export interface CoachingSuggestion {
  priority: 'high' | 'medium' | 'low';
  category: 'evidence' | 'completeness' | 'formatting' | 'length' | 'impact' | 'style';
  message: string;
  section_hint: string;
}

export interface CVCoachAssessment {
  quality_score: number;
  parsed_entities: ParsedEntities;
  section_analysis: SectionAnalysis;
  evidence_analysis: EvidenceAnalysis;
  coaching_suggestions: CoachingSuggestion[];
  sections_detected: string[];
  cv_char_count: number;
}

// Idea #55/#296/#297: Professional Summary Generator
export interface SummaryGenerationResponse {
  summary: string;
  debug_prompt?: string;
}

// ── Position Profiling (Idea #242) ──────────────────────────────────────────

export interface SkillFrequency {
  skill: string;
  frequency: number;
  frequency_pct: number;
  matched_count: number;
  match_rate: number;
}

export interface CorpusJob {
  job_id: string;
  company_name: string | null;
  job_title: string | null;
  ats_score: number | null;
}

// Epic #36: Onboarding wizard
export interface OnboardingStatus {
  has_profile: boolean;
  has_cv: boolean;
  has_saved_job: boolean;
}

export interface PositionProfileData {
  job_count: number;
  skill_frequency: SkillFrequency[];
  consistent_gaps: SkillFrequency[];
  strengths: SkillFrequency[];
  role_distribution: { title: string; count: number }[];
  corpus_jobs: CorpusJob[];
}

// CPD Intelligence: AI-Powered Development Recommendations (Epic #37)
export interface CPDSuggestion {
  title: string;
  provider: string;
  type: PDType;
  relevance: string;
  url: string | null;
  estimated_time: string | null;
  priority: number;
}

export interface CPDRefreshResponse {
  report_id: number;
  suggestions: CPDSuggestion[];
  generated_at: string;
  backend_type: string;
  search_enabled: boolean;
}
