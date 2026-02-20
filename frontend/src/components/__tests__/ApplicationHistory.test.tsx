import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, Mock, beforeEach } from 'vitest';
import ApplicationHistory from '../ApplicationHistory';
import * as api from '../../api';

// Mock the API calls
vi.mock('../../api', () => ({
  getApplications: vi.fn(),
  updateJobOutcome: vi.fn(),
}));

// Mock utils/matchTier.ts
vi.mock('../utils/matchTier', () => ({
  getMatchTier: vi.fn((score) => {
    if (score > 80) return { label: 'High', bgColor: 'bg-green-50', color: 'text-green-800', darkBgColor: 'dark:bg-green-900/30', darkTextColor: 'dark:text-green-300' };
    if (score > 60) return { label: 'Medium', bgColor: 'bg-yellow-50', color: 'text-yellow-800', darkBgColor: 'dark:bg-yellow-900/30', darkTextColor: 'dark:text-yellow-300' };
    return { label: 'Low', bgColor: 'bg-red-50', color: 'text-red-800', darkBgColor: 'dark:bg-red-900/30', darkTextColor: 'dark:text-red-300' };
  }),
}));

const mockApplications = [
  {
    job_id: 'job1',
    folder_name: 'job1_OLLAMA_20230101_100000',
    job_name: 'Software Engineer',
    company_name: 'Tech Corp',
    timestamp: '20230101_100000',
    backend: 'OLLAMA',
    ats_score: 75,
    outcome_status: 'submitted' as const,
    notes: 'Initial application submitted.',
    files: ['cv.docx', 'cover_letter.md'],
    submitted_at: '2023-01-01T10:00:00Z',
  },
  {
    job_id: 'job2',
    folder_name: 'job2_GEMINI_20230105_110000',
    job_name: 'Senior Developer',
    company_name: 'Innovate Inc.',
    timestamp: '20230105_110000',
    backend: 'GEMINI',
    ats_score: 88,
    outcome_status: 'interview' as const,
    files: ['cv.docx'],
    submitted_at: '2023-01-05T11:00:00Z',
    response_at: '2023-01-10T11:00:00Z',
  },
  {
    job_id: 'job3',
    folder_name: 'job3_OLLAMA_20221225_090000',
    job_name: 'Frontend Engineer',
    company_name: 'Web Solutions',
    timestamp: '20221225_090000',
    backend: 'OLLAMA',
    ats_score: 62,
    outcome_status: 'rejected' as const,
    notes: 'Not enough experience.',
    files: [],
    submitted_at: '2022-12-25T09:00:00Z',
    rejected_at: '2023-01-03T09:00:00Z',
    outcome_at: '2023-01-03T09:00:00Z',
  },
];

describe('ApplicationHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getApplications as Mock).mockResolvedValue([]);
  });

  it('renders loading state initially', () => {
    (api.getApplications as Mock).mockImplementationOnce(() => new Promise(() => {}));
    const { container } = render(<ApplicationHistory />);
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('renders error state with retry button', async () => {
    (api.getApplications as Mock).mockRejectedValueOnce(new Error('API down'));
    render(<ApplicationHistory />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load applications')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(api.getApplications).toHaveBeenCalledTimes(2);
  });

  it('renders "No applications yet" when applications array is empty', async () => {
    render(<ApplicationHistory />);
    await waitFor(() => {
      expect(screen.getByText('No applications yet')).toBeInTheDocument();
    });
  });

  it('renders application list when data loads', async () => {
    (api.getApplications as Mock).mockResolvedValue(mockApplications);
    render(<ApplicationHistory />);

    await waitFor(() => {
      expect(screen.getByText(/3 of 3 applications/)).toBeInTheDocument();
    });
  });

  it('renders stats row', async () => {
    (api.getApplications as Mock).mockResolvedValue(mockApplications);
    render(<ApplicationHistory />);

    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('Avg ATS')).toBeInTheDocument();
      expect(screen.getByText('Best ATS')).toBeInTheDocument();
      expect(screen.getByText('This Month')).toBeInTheDocument();
    });
  });
});
