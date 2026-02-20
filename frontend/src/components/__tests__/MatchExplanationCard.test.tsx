
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MatchExplanationCard from '../MatchExplanationCard';
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

describe('MatchExplanationCard', () => {
  it('renders without crashing', () => {
    render(<MatchExplanationCard analysis={mockAnalysisData} />);
    expect(screen.getByText('Match Explanation')).toBeInTheDocument();
  });

  it('shows final score badge', () => {
    render(<MatchExplanationCard analysis={mockAnalysisData} />);
    expect(screen.getByText('72%')).toBeInTheDocument();
  });

  it('shows score composition, matched keywords and legend after expanding', () => {
    render(<MatchExplanationCard analysis={mockAnalysisData} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('Score Composition')).toBeInTheDocument();
    expect(screen.getByText('Top Matched Keywords')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText(/Lexical/)).toBeInTheDocument();
  });
});
