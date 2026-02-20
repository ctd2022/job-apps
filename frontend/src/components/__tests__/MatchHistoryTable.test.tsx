
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MatchHistoryTable from '../MatchHistoryTable';
import type { MatchHistoryEntry } from '../../types';

const mockHistory: MatchHistoryEntry[] = [
  {
    id: 1,
    job_id: 'job1',
    cv_version_id: 1,
    score: 70,
    matched: 10,
    total: 20,
    missing_count: 10,
    created_at: new Date().toISOString(),
    version_number: 1,
    change_summary: 'Initial version',
    iteration: 1,
    delta: null,
  },
  {
    id: 2,
    job_id: 'job1',
    cv_version_id: 2,
    score: 75,
    matched: 15,
    total: 20,
    missing_count: 5,
    created_at: new Date().toISOString(),
    version_number: 2,
    change_summary: 'Added skills',
    iteration: 2,
    delta: 5,
  },
];

describe('MatchHistoryTable', () => {
  it('returns null when history has 0 entries', () => {
    const { container } = render(<MatchHistoryTable history={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('returns null when history has 1 entry', () => {
    const { container } = render(<MatchHistoryTable history={[mockHistory[0]]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders table with multiple entries', () => {
    render(<MatchHistoryTable history={mockHistory} />);
    expect(screen.getByText('Match History (2 iterations)')).toBeInTheDocument();
  });

  it('shows score with percent', () => {
    render(<MatchHistoryTable history={mockHistory} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows positive delta in green', () => {
    render(<MatchHistoryTable history={mockHistory} />);
    const deltaElement = screen.getByText('+5');
    expect(deltaElement).toBeInTheDocument();
    expect(deltaElement).toHaveClass('text-green-600');
  });
});
