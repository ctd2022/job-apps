
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ScoreComparisonPanel from '../ScoreComparisonPanel';
import type { ATSComparisonData } from '../../types';

const mockComparisonData: ATSComparisonData = {
  oldScore: 60,
  newScore: 68,
  delta: 8,
  categories: [
    {
      category: 'critical_keywords',
      oldMatched: 2,
      oldMissing: 3,
      newMatched: 3,
      newMissing: 2,
      delta: 1,
      keywordsNowMatched: ['Java'],
      keywordsStillMissing: ['Spring', 'Hibernate'],
      keywordsNewlyMissing: [],
    },
  ],
  keywordsAddressed: ['Python', 'AWS'],
  keywordsStillMissing: ['Docker'],
};

describe('ScoreComparisonPanel', () => {
  it('renders without crashing', () => {
    render(<ScoreComparisonPanel comparison={mockComparisonData} />);
    expect(screen.getByText('Score Comparison')).toBeInTheDocument();
  });

  it('shows positive delta badge', () => {
    render(<ScoreComparisonPanel comparison={mockComparisonData} />);
    expect(screen.getByText('+8')).toBeInTheDocument();
  });

  it('shows keywords now matched', () => {
    render(<ScoreComparisonPanel comparison={mockComparisonData} />);
    expect(screen.getByText('Keywords Now Matched (2)')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('AWS')).toBeInTheDocument();
  });

  it('shows keywords still missing', () => {
    render(<ScoreComparisonPanel comparison={mockComparisonData} />);
    expect(screen.getByText('Still Missing (1)')).toBeInTheDocument();
    expect(screen.getByText('Docker')).toBeInTheDocument();
  });

  it('shows category labels', () => {
    render(<ScoreComparisonPanel comparison={mockComparisonData} />);
    expect(screen.getByText('Critical Keywords')).toBeInTheDocument();
  });
});
