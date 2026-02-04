import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MissingKeywordsAlert from '../MissingKeywordsAlert';
import type { ATSAnalysisData, ATSCategoryScore } from '../../types';

describe('MissingKeywordsAlert', () => {
  const mockScores: Record<string, ATSCategoryScore> = {
    critical_keywords: { matched: 1, missing: 2, items_matched: ['Java'], items_missing: ['Python', 'AWS'] },
    required: { matched: 0, missing: 1, items_matched: [], items_missing: ['Docker'] },
    hard_skills: { matched: 2, missing: 1, items_matched: ['Git', 'Jira'], items_missing: ['Kubernetes'] },
    preferred: { matched: 1, missing: 1, items_matched: ['CI/CD'], items_missing: ['GraphQL'] },
  };

  const mockAnalysisData: ATSAnalysisData = {
    score: 50,
    matched: 4,
    total: 9,
    missing_keywords: ['Python', 'AWS', 'Docker', 'Kubernetes', 'GraphQL'],
    matched_keywords: ['Java', 'Git', 'Jira', 'CI/CD'],
    top_job_keywords: [],
    scores_by_category: mockScores,
    matched_phrases: [],
    missing_phrases: [],
    section_analysis: {
      experience_matches: [],
      skills_matches: [],
      projects_matches: [],
      not_found_in_cv: [],
      cv_sections_detected: 0,
      jd_sections_detected: 0,
    },
    evidence_analysis: {
      strong_evidence_count: 0,
      moderate_evidence_count: 0,
      weak_evidence_count: 0,
      average_strength: 0,
      strong_skills: [],
      weak_skills: [],
    },
    parsed_entities: {
      cv_hard_skills: [],
      cv_soft_skills: [],
      jd_required_skills: [],
      jd_preferred_skills: [],
      cv_years_experience: null,
      jd_years_required: null,
    },
    hybrid_scoring: {
      final_score: 0,
      lexical_score: 0,
      lexical_weight: 0,
      lexical_contribution: 0,
      semantic_score: 0,
      semantic_weight: 0,
      semantic_contribution: 0,
      evidence_score: 0,
      evidence_weight: 0,
      evidence_contribution: 0,
      semantic_available: false,
    },
    semantic_analysis: {
      available: false,
      score: 0,
      section_similarities: {},
      top_matches: [],
      gaps: [],
      entity_support_ratio: 0,
      high_value_match_count: 0,
    },
  };

  const mockSuccessAnalysisData: ATSAnalysisData = {
    ...mockAnalysisData,
    score: 100,
    matched: 9,
    total: 9,
    missing_keywords: [],
    scores_by_category: {
      critical_keywords: { matched: 3, missing: 0, items_matched: ['Python', 'AWS', 'Java'], items_missing: [] },
      required: { matched: 1, missing: 0, items_matched: ['Docker'], items_missing: [] },
      hard_skills: { matched: 3, missing: 0, items_matched: ['Git', 'Jira', 'Kubernetes'], items_missing: [] },
      preferred: { matched: 2, missing: 0, items_matched: ['CI/CD', 'GraphQL'], items_missing: [] },
    },
  };

  it('renders without crashing', () => {
    render(<MissingKeywordsAlert analysis={mockAnalysisData} />);
    expect(screen.getByText('Missing Keywords')).toBeInTheDocument();
  });

  it('shows success state when no keywords missing', () => {
    render(<MissingKeywordsAlert analysis={mockSuccessAnalysisData} />);
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('shows critical missing keywords', () => {
    render(<MissingKeywordsAlert analysis={mockAnalysisData} />);
    expect(screen.getByText('Critical - High Priority')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('AWS')).toBeInTheDocument();
  });

  it('shows required missing keywords', () => {
    render(<MissingKeywordsAlert analysis={mockAnalysisData} />);
    expect(screen.getByText('Required Skills')).toBeInTheDocument();
    expect(screen.getByText('Docker')).toBeInTheDocument();
  });

  it('shows technical skills missing', () => {
    render(<MissingKeywordsAlert analysis={mockAnalysisData} />);
    expect(screen.getByText('Technical Skills')).toBeInTheDocument();
    expect(screen.getByText('Kubernetes')).toBeInTheDocument();
  });

  it('shows nice-to-have missing keywords', () => {
    render(<MissingKeywordsAlert analysis={mockAnalysisData} />);
    expect(screen.getByText('Nice to Have')).toBeInTheDocument();
    expect(screen.getByText('GraphQL')).toBeInTheDocument();
  });

  it('shows correct total badge count', () => {
    const customAnalysis = {
      ...mockAnalysisData,
      scores_by_category: {
        ...mockAnalysisData.scores_by_category,
        critical_keywords: { ...mockAnalysisData.scores_by_category.critical_keywords, items_missing: ['Python', 'AWS'] },
        required: { ...mockAnalysisData.scores_by_category.required, items_missing: ['Docker'] },
        hard_skills: { ...mockAnalysisData.scores_by_category.hard_skills, items_missing: ['Kubernetes'] },
        preferred: { ...mockAnalysisData.scores_by_category.preferred, items_missing: [] },
      },
    };
    render(<MissingKeywordsAlert analysis={customAnalysis} />);
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('shows summary tip text', () => {
    render(<MissingKeywordsAlert analysis={mockAnalysisData} />);
    expect(screen.getByText(/Adding these keywords naturally to your CV may improve ATS match score./)).toBeInTheDocument();
  });
});
