import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, Mock, beforeEach } from 'vitest';
import Dashboard from './Dashboard';
import { getHealth, getJobs, getApplications, getMetrics } from '../api';
import type { HealthStatus, Job, Application, Metrics } from '../types';

// Mock API calls
vi.mock('../api', () => ({
  getHealth: vi.fn(),
  getJobs: vi.fn(),
  getApplications: vi.fn(),
  getMetrics: vi.fn(),
}));

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: vi.fn().mockImplementation(({ children, to, ...rest }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    )),
  };
});

// Mock utils/matchTier.ts (already mocked in ApplicationHistory.test.tsx, but good to have here too)
vi.mock('../utils/matchTier', () => ({
  getMatchTier: vi.fn((score) => {
    if (score > 80) return { label: 'High', bgColor: 'bg-green-50', color: 'text-green-800', darkBgColor: 'dark:bg-green-900/30', darkTextColor: 'dark:text-green-300' };
    if (score > 60) return { label: 'Medium', bgColor: 'bg-yellow-50', color: 'text-yellow-800', darkBgColor: 'dark:bg-yellow-900/30', darkTextColor: 'dark:text-yellow-300' };
    return { label: 'Low', bgColor: 'bg-red-50', color: 'text-red-800', darkBgColor: 'dark:bg-red-900/30', darkTextColor: 'dark:text-red-300' };
  }),
}));

// Mock PipelineDiagnosis since it's a separate component
vi.mock('./PipelineDiagnosis', () => ({
  default: vi.fn(() => <div data-testid="pipeline-diagnosis">Mock Pipeline Diagnosis</div>),
}));

const mockHealth: HealthStatus = {
  status: 'ok',
  version: '1.0.0',
  backends: {
    ollama: true,
    llamacpp: false,
    gemini: true,
  },
  workflow_available: true,
};

const mockJobs: Job[] = [
  {
    id: 'job1',
    status: 'processing',
    progress: 50,
    stage: 'Analyzing CV',
    backend: 'OLLAMA',
    enable_ats: true,
    created_at: '2023-01-01T12:00:00Z',
    outcome_status: 'draft',
  },
  {
    id: 'job2',
    status: 'pending',
    progress: 0,
    stage: 'Queued',
    backend: 'GEMINI',
    enable_ats: true,
    created_at: '2023-01-02T12:00:00Z',
    outcome_status: 'draft',
  },
];

const mockApplications: Application[] = [
  {
    job_id: 'app1',
    folder_name: 'app1_folder',
    job_name: 'Software Engineer',
    company_name: 'Google',
    timestamp: '20230101_100000',
    backend: 'GEMINI',
    ats_score: 85,
    outcome_status: 'submitted' as const,
    files: [],
  },
  {
    job_id: 'app2',
    folder_name: 'app2_folder',
    job_name: 'Frontend Developer',
    company_name: 'Meta',
    timestamp: '20230102_110000',
    backend: 'OLLAMA',
    ats_score: 70,
    outcome_status: 'interview' as const,
    files: [],
  },
];

const mockMetrics: Metrics = {
  total: 10,
  by_status: { submitted: 5, interview: 3, rejected: 2 },
  funnel: { submitted: 10, response: 5, interview: 3, offer: 1 },
  rates: { response_rate: 50, interview_rate: 60, offer_rate: 33 },
  avg_time_to_response_days: 5,
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getHealth as Mock).mockResolvedValue(mockHealth);
    (getJobs as Mock).mockResolvedValue(mockJobs);
    (getApplications as Mock).mockResolvedValue(mockApplications);
    (getMetrics as Mock).mockResolvedValue(mockMetrics);
    mockNavigate.mockClear();
  });

  it('renders loading state initially', () => {
    (getHealth as Mock).mockReturnValueOnce(new Promise(() => {})); // Never resolve to simulate loading
    const { container } = render(<Dashboard />);
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('renders error state when API calls fail', async () => {
    (getHealth as Mock).mockRejectedValueOnce(new Error('Network error'));
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Failed to connect to backend')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(getHealth).toHaveBeenCalledTimes(2); // Initial load + retry
  });

  it('renders dashboard content after successful loading', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Applications')).toBeInTheDocument(); // StatBox label
      expect(screen.getByText('Avg ATS')).toBeInTheDocument(); // StatBox label
      expect(screen.getByText('Active')).toBeInTheDocument(); // StatBox label
      expect(screen.getByText('Backends')).toBeInTheDocument(); // StatBox label
      expect(screen.getByText('New Application')).toBeInTheDocument(); // Link
      expect(screen.getByText('Ollama')).toBeInTheDocument(); // Backend status
      expect(screen.getByText('Gemini')).toBeInTheDocument(); // Backend status
      expect(screen.getByText('Application Funnel')).toBeInTheDocument(); // Funnel chart title
      expect(screen.getByText('Active Jobs')).toBeInTheDocument(); // Active Jobs section title
      expect(screen.getByText('Recent Applications')).toBeInTheDocument(); // Recent Applications section title
      expect(screen.getByTestId('pipeline-diagnosis')).toBeInTheDocument(); // Mocked PipelineDiagnosis
    });
  });
});
