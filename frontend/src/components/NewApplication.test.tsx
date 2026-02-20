import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, Mock, beforeEach } from 'vitest';
import NewApplication from './NewApplication';
import { getBackends, createJob, subscribeToJobWithFallback, getJobFiles, getCVs } from '../api';
import type { Backend, Job, StoredCV, OutputFile } from '../types';

// Mock API calls
vi.mock('../api', () => ({
  getBackends: vi.fn(),
  createJob: vi.fn(),
  subscribeToJobWithFallback: vi.fn(),
  getJobFiles: vi.fn(),
  getCVs: vi.fn(),
  createCV: vi.fn(),
  deleteCV: vi.fn(),
  setDefaultCV: vi.fn(),
}));

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock FilePreview and matchTier as they are external dependencies
vi.mock('./FilePreview', () => ({
  default: vi.fn(() => <div data-testid="file-preview">Mock File Preview</div>),
}));

vi.mock('../utils/matchTier', () => ({
  getMatchTier: vi.fn((score) => {
    if (score > 80) return { label: 'High', bgColor: 'bg-green-50', color: 'text-green-800', darkBgColor: 'dark:bg-green-900/30', darkTextColor: 'dark:text-green-300' };
    if (score > 60) return { label: 'Medium', bgColor: 'bg-yellow-50', color: 'text-yellow-800', darkBgColor: 'dark:bg-yellow-900/30', darkTextColor: 'dark:text-yellow-300' };
    return { label: 'Low', bgColor: 'bg-red-50', color: 'text-red-800', darkBgColor: 'dark:bg-red-900/30', darkTextColor: 'dark:text-red-300' };
  }),
  getScoreBarColor: vi.fn(() => 'bg-green-500'),
}));

const mockBackends: Backend[] = [
  { id: 'ollama', name: 'Ollama', available: true, default_model: 'llama2', models: ['llama2', 'codellama'], description: 'Local Ollama' },
  { id: 'gemini', name: 'Gemini', available: true, default_model: 'gemini-pro', models: ['gemini-pro', 'gemini-ultra'], description: 'Google Gemini' },
  { id: 'llamacpp', name: 'Llama.cpp', available: false, description: 'Local C++ runner' },
];

const mockStoredCVs: StoredCV[] = [
  { id: 1, name: 'My Default CV', filename: 'default.pdf', is_default: true, created_at: '2023-01-01T00:00:00Z' },
  { id: 2, name: 'My Other CV', filename: 'other.pdf', is_default: false, created_at: '2023-01-02T00:00:00Z' },
];

const mockJob: Job = {
  id: 'test-job-id',
  status: 'processing',
  progress: 0,
  stage: 'Starting',
  backend: 'ollama',
  enable_ats: true,
  created_at: '2023-01-01T00:00:00Z',
  outcome_status: 'draft',
};

const mockCompletedJob: Job = {
  ...mockJob,
  status: 'completed',
  progress: 100,
  stage: 'Completed',
  ats_score: 75,
};

const mockOutputFiles: OutputFile[] = [
  { name: 'tailored_cv.pdf', size: 1000, type: 'application/pdf' },
  { name: 'ats_analysis.json', size: 500, type: 'application/json' },
];

describe('NewApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getBackends as Mock).mockResolvedValue(mockBackends);
    (getCVs as Mock).mockResolvedValue(mockStoredCVs);
    (createJob as Mock).mockResolvedValue(mockJob);
    (subscribeToJobWithFallback as Mock).mockImplementation((_jobId, onProgress, onComplete, _onError) => {
      onProgress({ ...mockJob, progress: 50, stage: 'Generating files' });
      onComplete(mockCompletedJob);
      return vi.fn(); // Cleanup function
    });
    (getJobFiles as Mock).mockResolvedValue(mockOutputFiles);
    mockNavigate.mockClear();
  });

  it('renders loading state initially', () => {
    (getBackends as Mock).mockReturnValueOnce(new Promise(() => {}));
    const { container } = render(<NewApplication />);
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('renders form fields correctly after loading', async () => {
    render(<NewApplication />);
    await waitFor(() => {
      expect(screen.getByText('New Application')).toBeInTheDocument();
      expect(screen.getByLabelText('ATS')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Saved \(2\)/i })).toHaveClass('bg-slate-700'); // 'Saved (2)' button is active
      const myDefaultCvEntry = screen.getByText('My Default CV').closest('div.flex.items-center.justify-between') as HTMLElement;
      expect(within(myDefaultCvEntry).getByRole('radio')).toBeChecked(); // Default CV selected
      expect(screen.getAllByRole('button', { name: /Upload/i }).length).toBeGreaterThanOrEqual(1); // Upload buttons present
      expect(screen.getByPlaceholderText('Optional')).toBeInTheDocument(); // Company Name
      expect(screen.getByPlaceholderText('e.g. Senior Engineer')).toBeInTheDocument(); // Job Title
      expect(screen.getByRole('button', { name: /Generate/i })).toBeInTheDocument();
    });
  });

  it('allows toggling between stored and upload CV modes', async () => {
    render(<NewApplication />);
    await waitFor(() => expect(screen.getByText('My Default CV')).toBeInTheDocument());

    // Switch to Upload CV mode
    const cvUploadButton = screen.getAllByRole('button', { name: 'Upload' })[0];
    fireEvent.click(cvUploadButton);
    const cvSection = screen.getByText('CV').closest('div.grid.grid-cols-2 > div:first-of-type') as HTMLElement; // Get the main CV column
    const cvDropZone = within(cvSection).getByText('Drop file or click to browse').closest('div.relative.border') as HTMLElement;
    expect(within(cvDropZone).getByText('Drop file or click to browse')).toBeInTheDocument();

    // Switch back to Stored CV mode
    fireEvent.click(screen.getByRole('button', { name: /Saved \(2\)/i }));
    expect(screen.getByText('My Default CV')).toBeInTheDocument();
  });

  it('allows toggling between upload and paste job description modes', async () => {
    render(<NewApplication />);
    await waitFor(() => expect(screen.getByText('New Application')).toBeInTheDocument());

    // Switch to Paste JD mode
    fireEvent.click(screen.getByRole('button', { name: 'Paste' }));
    expect(screen.getByPlaceholderText('Paste the job description text here...')).toBeInTheDocument();

    // Switch back to Upload JD mode
    const jobDescUploadButton = screen.getAllByRole('button', { name: 'Upload' })[1];
    fireEvent.click(jobDescUploadButton);
    expect(screen.getByText('Drop file or click to browse')).toBeInTheDocument();
  });

  it('disables Generate button when CV or Job Description is missing', async () => {
    (getCVs as Mock).mockResolvedValueOnce([]); // No stored CVs — switches to upload mode
    render(<NewApplication />);
    await waitFor(() => expect(screen.getAllByText('Drop file or click to browse')[0]).toBeInTheDocument());

    // Button should be disabled — no CV file and no JD provided
    const generateButton = screen.getByRole('button', { name: 'Generate' });
    expect(generateButton).toBeDisabled();
  });

  it('submits the form and calls createJob with correct args', async () => {
    render(<NewApplication />);
    await waitFor(() => expect(screen.getByText('My Default CV')).toBeInTheDocument());

    // Provide job file
    const jobFile = new File(['job description'], 'job.txt', { type: 'text/plain' });
    const jobDescriptionColumn = screen.getByText('Job Description').closest('div.grid.grid-cols-2 > div:nth-of-type(2)') as HTMLElement;
    const jobDropZone = jobDescriptionColumn.querySelector('div.relative.border') as HTMLElement;
    const jobFileInput = jobDropZone.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(jobFileInput, { target: { files: [jobFile] } });

    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));

    await waitFor(() => {
      expect(createJob).toHaveBeenCalledWith({
        cv_id: 1,
        cv_file: undefined,
        job_file: jobFile,
        company_name: undefined,
        job_title: undefined,
        backend: 'ollama',
        model: 'llama2',
        enable_ats: true,
      });
    });
  });

  it('displays generated files and ATS score upon job completion', async () => {
    render(<NewApplication />);
    await waitFor(() => expect(screen.getByText('My Default CV')).toBeInTheDocument());

    // Trigger job submission and completion
    const jobFile = new File(['job description'], 'job.txt', { type: 'text/plain' });
    const jobDescriptionColumn = screen.getByText('Job Description').closest('div.grid.grid-cols-2 > div:nth-of-type(2)') as HTMLElement;
    const jobDropZone = jobDescriptionColumn.querySelector('div.relative.border') as HTMLElement;
    const jobFileInput = jobDropZone.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(jobFileInput, { target: { files: [jobFile] } });
    fireEvent.click(screen.getByRole('button', { name: /Generate/i }));

    await waitFor(() => {
      expect(screen.getByText('Application Generated!')).toBeInTheDocument();
      expect(screen.getByText('ATS Match Score')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByTestId('file-preview')).toBeInTheDocument();
    });
  });
});