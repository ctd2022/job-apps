import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import ATSExplainability from '../ATSExplainability';
import type { ATSAnalysisData } from '../../types';

const mockAnalysis: ATSAnalysisData = {
  score: 72,
  matched: 10,
  total: 14,
  missing_keywords: ['kubernetes'],
  matched_keywords: ['python', 'aws', 'react'],
  top_job_keywords: ['python', 'aws', 'kubernetes'],
  scores_by_category: {
    critical_keywords: { matched: 3, missing: 1, items_matched: ['python', 'aws', 'react'], items_missing: ['kubernetes'] },
    required: { matched: 2, missing: 0, items_matched: ['docker', 'git'], items_missing: [] },
    hard_skills: { matched: 3, missing: 2, items_matched: ['typescript', 'node', 'sql'], items_missing: ['terraform', 'gcp'] },
    soft_skills: { matched: 2, missing: 0, items_matched: ['leadership', 'communication'], items_missing: [] },
  },
  matched_phrases: [],
  missing_phrases: [],
  section_analysis: {
    experience_matches: ['python', 'aws'],
    skills_matches: ['react', 'typescript'],
    projects_matches: ['docker'],
    not_found_in_cv: ['kubernetes'],
    cv_sections_detected: 4,
    jd_sections_detected: 3,
  },
  evidence_analysis: {
    strong_evidence_count: 5,
    moderate_evidence_count: 2,
    weak_evidence_count: 1,
    average_strength: 0.75,
    strong_skills: ['python', 'aws'],
    weak_skills: ['sql'],
  },
  parsed_entities: {
    cv_hard_skills: ['python', 'aws', 'react'],
    cv_soft_skills: ['leadership'],
    jd_required_skills: ['python', 'kubernetes'],
    jd_preferred_skills: ['terraform'],
    cv_years_experience: 5,
    jd_years_required: 3,
  },
  hybrid_scoring: {
    final_score: 72,
    lexical_score: 68,
    lexical_weight: 0.4,
    lexical_contribution: 27.2,
    semantic_score: 78,
    semantic_weight: 0.35,
    semantic_contribution: 27.3,
    evidence_score: 70,
    evidence_weight: 0.25,
    evidence_contribution: 17.5,
    semantic_available: true,
  },
  semantic_analysis: {
    available: true,
    score: 78,
    section_similarities: { experience: 0.82, skills: 0.75 },
    top_matches: [],
    gaps: ['infrastructure automation', 'cloud architecture'],
    entity_support_ratio: 0.71,
    high_value_match_count: 4,
  },
};

describe('ATSExplainability', () => {
  it('renders score breakdown table', () => {
    render(<ATSExplainability analysis={mockAnalysis} />);
    expect(screen.getByText('Score Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Lexical')).toBeInTheDocument();
    expect(screen.getByText('Semantic')).toBeInTheDocument();
    expect(screen.getByText('Evidence')).toBeInTheDocument();
  });

  it('renders category completion bars', () => {
    render(<ATSExplainability analysis={mockAnalysis} />);
    expect(screen.getByText('Category Completion')).toBeInTheDocument();
    expect(screen.getByText('Critical Keywords')).toBeInTheDocument();
    expect(screen.getByText('Technical Skills')).toBeInTheDocument();
  });

  it('renders biggest penalties', async () => {
    const user = userEvent.setup();
    render(<ATSExplainability analysis={mockAnalysis} />);
    const header = screen.getByText('Biggest Penalties');
    expect(header).toBeInTheDocument();
    // Expand collapsed section
    await user.click(header);
    expect(screen.getByText('kubernetes')).toBeInTheDocument();
  });

  it('renders semantic insights when available', async () => {
    const user = userEvent.setup();
    render(<ATSExplainability analysis={mockAnalysis} />);

    // Semantic Insights is collapsed by default — click to expand
    const header = screen.getByText('Semantic Insights');
    await user.click(header);

    expect(screen.getByText('Entity Support Ratio')).toBeInTheDocument();
    expect(screen.getByText('infrastructure automation')).toBeInTheDocument();
  });

  it('hides semantic section when not available', () => {
    const noSemantic: ATSAnalysisData = {
      ...mockAnalysis,
      semantic_analysis: { ...mockAnalysis.semantic_analysis, available: false },
    };
    render(<ATSExplainability analysis={noSemantic} />);
    expect(screen.queryByText('Semantic Insights')).not.toBeInTheDocument();
  });
});
