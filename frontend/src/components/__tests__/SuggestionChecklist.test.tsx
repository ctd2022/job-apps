import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import SuggestionChecklist from '../SuggestionChecklist';
import type { ATSAnalysisData, Backend } from '../../types';

const mockAnalysis: ATSAnalysisData = {
  score: 62,
  matched: 8,
  total: 15,
  missing_keywords: ['kubernetes', 'terraform'],
  matched_keywords: ['python', 'aws'],
  top_job_keywords: ['python', 'aws', 'kubernetes'],
  scores_by_category: {
    critical_keywords: { matched: 2, missing: 1, items_matched: ['python'], items_missing: ['kubernetes'] },
    required: { matched: 3, missing: 1, items_matched: ['aws'], items_missing: ['terraform'] },
    hard_skills: { matched: 0, missing: 0, items_matched: [], items_missing: [] },
  },
  matched_phrases: [],
  missing_phrases: [],
  section_analysis: {
    experience_matches: ['python'],
    skills_matches: ['aws'],
    projects_matches: [],
    not_found_in_cv: ['kubernetes'],
    cv_sections_detected: 3,
    jd_sections_detected: 2,
  },
  evidence_analysis: {
    strong_evidence_count: 2,
    moderate_evidence_count: 1,
    weak_evidence_count: 1,
    average_strength: 0.6,
    strong_skills: ['python'],
    weak_skills: ['docker'],
  },
  parsed_entities: {
    cv_hard_skills: ['python', 'aws'],
    cv_soft_skills: [],
    jd_required_skills: ['python', 'kubernetes'],
    jd_preferred_skills: ['terraform'],
    cv_years_experience: null,
    jd_years_required: null,
  },
  hybrid_scoring: {
    final_score: 62,
    lexical_score: 55,
    lexical_weight: 0.4,
    lexical_contribution: 22,
    semantic_score: 70,
    semantic_weight: 0.35,
    semantic_contribution: 24.5,
    evidence_score: 50,
    evidence_weight: 0.25,
    evidence_contribution: 12.5,
    semantic_available: true,
  },
  semantic_analysis: {
    available: true,
    score: 70,
    section_similarities: {},
    top_matches: [],
    gaps: [],
    entity_support_ratio: 0.6,
    high_value_match_count: 2,
  },
  gap_analysis: {
    critical_gaps: {
      missing_critical_keywords: ['kubernetes'],
      missing_required_skills: ['terraform'],
    },
    evidence_gaps: {
      weak_evidence_skills: ['docker'],
    },
    semantic_gaps: {
      missing_concepts: [],
    },
    experience_gaps: {
      cv_years: null,
      jd_years: null,
      gap: 0,
    },
  },
};

const mockBackends: Backend[] = [
  { id: 'ollama', name: 'Ollama', available: true, description: 'Local', default_model: 'llama3.1:8b', models: ['llama3.2:3b', 'llama3.1:8b'] },
  { id: 'gemini', name: 'Gemini', available: true, description: 'Cloud', default_model: 'gemini-2.0-flash', models: ['gemini-2.0-flash', 'gemini-2.5-flash'] },
];

describe('SuggestionChecklist', () => {
  it('renders missing keywords grouped by category', () => {
    render(
      <SuggestionChecklist analysis={mockAnalysis} onApply={vi.fn()} applying={false} />,
    );
    expect(screen.getByText('kubernetes')).toBeInTheDocument();
    expect(screen.getByText('terraform')).toBeInTheDocument();
  });

  it('renders weak skills section', () => {
    render(
      <SuggestionChecklist analysis={mockAnalysis} onApply={vi.fn()} applying={false} />,
    );
    expect(screen.getByText('docker')).toBeInTheDocument();
  });

  it('calls onApply with selected keywords', async () => {
    const onApply = vi.fn();
    const user = userEvent.setup();
    render(
      <SuggestionChecklist analysis={mockAnalysis} onApply={onApply} applying={false} />,
    );

    // Select a keyword
    const checkbox = screen.getByText('kubernetes').closest('label')?.querySelector('input');
    expect(checkbox).toBeTruthy();
    await user.click(checkbox!);

    // Click apply
    await user.click(screen.getByText('Apply Selected'));
    expect(onApply).toHaveBeenCalledTimes(1);
    const [keywords] = onApply.mock.calls[0];
    expect(keywords).toContain('kubernetes');
  });

  it('renders backend picker when backends provided', () => {
    render(
      <SuggestionChecklist
        analysis={mockAnalysis}
        onApply={vi.fn()}
        applying={false}
        backends={mockBackends}
      />,
    );
    expect(screen.getByText('Default backend')).toBeInTheDocument();
  });

  it('shows models dropdown when backend selected', async () => {
    const user = userEvent.setup();
    render(
      <SuggestionChecklist
        analysis={mockAnalysis}
        onApply={vi.fn()}
        applying={false}
        backends={mockBackends}
      />,
    );

    const backendSelect = screen.getByDisplayValue('Default backend');
    await user.selectOptions(backendSelect, 'gemini');
    expect(screen.getByText('Default model')).toBeInTheDocument();
  });

  it('disables Apply button when nothing selected', () => {
    render(
      <SuggestionChecklist analysis={mockAnalysis} onApply={vi.fn()} applying={false} />,
    );
    const btn = screen.getByText('Apply Selected');
    expect(btn).toBeDisabled();
  });
});
