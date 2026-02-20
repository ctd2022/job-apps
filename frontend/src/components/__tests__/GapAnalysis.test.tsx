import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GapAnalysis from '../GapAnalysis';
import type { GapAnalysis as GapAnalysisData } from '../../types';

describe('GapAnalysis', () => {
  const fullMockData: GapAnalysisData = {
    critical_gaps: {
      missing_critical_keywords: ['Python', 'AWS'],
      missing_required_skills: [],
    },
    evidence_gaps: {
      weak_evidence_skills: ['Docker'],
    },
    semantic_gaps: {
      missing_concepts: ['microservices'],
    },
    experience_gaps: {
      cv_years: 3,
      jd_years: 5,
      gap: 2,
    },
  };

  const emptyMockData: GapAnalysisData = {
    critical_gaps: {
      missing_critical_keywords: [],
      missing_required_skills: [],
    },
    evidence_gaps: {
      weak_evidence_skills: [],
    },
    semantic_gaps: {
      missing_concepts: [],
    },
    experience_gaps: {
      cv_years: 5,
      jd_years: 5,
      gap: 0,
    },
  };

  it('renders without crashing', () => {
    render(<GapAnalysis gapAnalysis={fullMockData} />);
    expect(screen.getByText('Gap Analysis')).toBeInTheDocument();
  });

  it('shows critical gaps when present', () => {
    render(<GapAnalysis gapAnalysis={fullMockData} />);
    expect(screen.getByText('Critical Gaps')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('AWS')).toBeInTheDocument();
  });

  it('shows evidence gaps when present', () => {
    render(<GapAnalysis gapAnalysis={fullMockData} />);
    expect(screen.getByText('Evidence Gaps')).toBeInTheDocument();
    expect(screen.getByText('Docker')).toBeInTheDocument();
  });

  it('shows semantic gaps when semanticAvailable is true', () => {
    render(<GapAnalysis gapAnalysis={fullMockData} semanticAvailable={true} />);
    expect(screen.getByText('Semantic Gaps')).toBeInTheDocument();
    expect(screen.getByText('microservices')).toBeInTheDocument();
  });

  it('hides semantic gaps when semanticAvailable is false', () => {
    render(<GapAnalysis gapAnalysis={fullMockData} semanticAvailable={false} />);
    expect(screen.queryByText('Semantic Gaps')).not.toBeInTheDocument();
  });

  it('shows experience gap when gap > 0', () => {
    render(<GapAnalysis gapAnalysis={fullMockData} />);
    screen.getByText((_content, element) => {
      const hasText = (node: Element) => node.textContent === "The job requires 5 years of experience, and your CV shows 3 years. This is a gap of 2 years."
      const elementHasText = hasText(element as Element)
      const childrenDontHaveText = Array.from(element?.children || []).every(
        child => !hasText(child as Element)
      )
      return elementHasText && childrenDontHaveText
    })
  });

  it('hides sections when data is empty', () => {
    render(<GapAnalysis gapAnalysis={emptyMockData} />);
    expect(screen.queryByText('Critical Gaps')).not.toBeInTheDocument();
    expect(screen.queryByText('Evidence Gaps')).not.toBeInTheDocument();
    expect(screen.queryByText('Semantic Gaps')).not.toBeInTheDocument();
    expect(screen.queryByText('Experience Gap')).not.toBeInTheDocument();
  });

  it('badge count reflects number of active gap categories', () => {
    render(<GapAnalysis gapAnalysis={fullMockData} semanticAvailable={true} />);
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
