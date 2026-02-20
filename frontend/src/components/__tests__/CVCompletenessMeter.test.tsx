
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CVCompletenessMeter from '../CVCompletenessMeter';
import type { ATSAnalysisData } from '../../types';

const mockAnalysisData: ATSAnalysisData = {
  score: 72,
  matched: 15,
  total: 25,
  missing_keywords: ['Terraform', 'Ansible'],
  matched_keywords: ['Python', 'React', 'AWS', 'Docker', 'SQL'],
  top_job_keywords: [],
  scores_by_category: {},
  matched_phrases: [],
  missing_phrases: [],
  section_analysis: {
    experience_matches: ['Worked as a software engineer'],
    skills_matches: [],
    projects_matches: [],
    not_found_in_cv: [],
    cv_sections_detected: 1,
    jd_sections_detected: 1,
  },
  evidence_analysis: {
    strong_evidence_count: 1,
    moderate_evidence_count: 0,
    weak_evidence_count: 0,
    average_strength: 0,
    strong_skills: [],
    weak_skills: [],
  },
  parsed_entities: {
    cv_hard_skills: ['Python', 'AWS', 'React'],
    cv_soft_skills: [],
    jd_required_skills: [],
    jd_preferred_skills: [],
    cv_years_experience: null,
    jd_years_required: null,
  },
  hybrid_scoring: {
    final_score: 72,
    lexical_score: 60,
    lexical_weight: 0.55,
    lexical_contribution: 33,
    semantic_score: 80,
    semantic_weight: 0.35,
    semantic_contribution: 28,
    evidence_score: 90,
    evidence_weight: 0.1,
    evidence_contribution: 9,
    semantic_available: true,
  },
  semantic_analysis: {
    available: true,
    score: 80,
    section_similarities: {},
    top_matches: [],
    gaps: [],
    entity_support_ratio: 0,
    high_value_match_count: 0,
  },
};

describe('CVCompletenessMeter', () => {
  it('renders without crashing', () => {
    render(<CVCompletenessMeter analysis={mockAnalysisData} />);
    expect(screen.getByText('CV Completeness')).toBeInTheDocument();
  });

  it('shows completeness percentage', () => {
    render(<CVCompletenessMeter analysis={mockAnalysisData} />);
    // Skills (25) + Experience (30) + Education (15) + Evidence (15) = 85
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('shows section checklist', () => {
    render(<CVCompletenessMeter analysis={mockAnalysisData} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Section Checklist')).toBeInTheDocument();
  });

  it('shows detected sections with checkmark', () => {
    render(<CVCompletenessMeter analysis={mockAnalysisData} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Skills Section')).toBeInTheDocument();
  });

  it('shows suggestions for missing sections', () => {
    const dataWithMissingProjects = {
      ...mockAnalysisData,
      section_analysis: {
        ...mockAnalysisData.section_analysis,
        projects_matches: [],
      },
      parsed_entities: {
        ...mockAnalysisData.parsed_entities,
      },
      evidence_analysis: {
        ...mockAnalysisData.evidence_analysis,
      },
    };
    render(<CVCompletenessMeter analysis={dataWithMissingProjects} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Suggestions')).toBeInTheDocument();
  });

  it('shows hard skills count', () => {
    render(<CVCompletenessMeter analysis={mockAnalysisData} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Hard Skills Found')).toBeInTheDocument();
  });
});
