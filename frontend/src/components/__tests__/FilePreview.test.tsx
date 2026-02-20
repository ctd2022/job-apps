import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, Mock, beforeEach } from 'vitest';
import FilePreview from '../FilePreview';
import { getJobFileContent, getJobFileUrl } from '../../api';

// Mock the API calls
vi.mock('../../api');

const mockJobId = 'test-job-id';
const mockFiles = [
  { name: 'ats_report.md', path: '/path/to/ats_report.md', type: 'markdown', size: 100 },
  { name: 'cover_letter.docx', path: '/path/to/cover_letter.docx', type: 'docx', size: 100 },
  { name: 'metadata.json', path: '/path/to/metadata.json', type: 'json', size: 100 },
  { name: 'cv_tailored.txt', path: '/path/to/cv_tailored.txt', type: 'text', size: 100 },
];

describe('FilePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getJobFileContent as Mock).mockResolvedValue({
      content: '# Markdown Content', type: 'markdown'
    });
    (getJobFileUrl as Mock).mockImplementation((jobId, fileName) => `/api/jobs/${jobId}/files/${fileName}`);
  });

  it('renders without crashing with empty files', () => {
    render(<FilePreview jobId={mockJobId} files={[]} />);
    expect(screen.queryByText(/Formatting Tips/)).not.toBeInTheDocument();
  });

  it('renders previewable file tabs and excludes download-only files', () => {
    render(<FilePreview jobId={mockJobId} files={mockFiles} />);
    expect(screen.getByText('ATS Analysis')).toBeInTheDocument();
    expect(screen.getByText('Metadata')).toBeInTheDocument();
    expect(screen.getByText('Tailored CV')).toBeInTheDocument();
  });

  it('renders download-only files section', () => {
    render(<FilePreview jobId={mockJobId} files={mockFiles} />);
    expect(screen.getByText('Download Only')).toBeInTheDocument();
    expect(screen.getByText('.docx')).toBeInTheDocument();
  });

  it('loads and displays content when a tab is clicked', async () => {
    render(<FilePreview jobId={mockJobId} files={mockFiles} />);
    fireEvent.click(screen.getByText('ATS Analysis'));

    expect(getJobFileContent).toHaveBeenCalledWith(mockJobId, 'ats_report.md');
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Markdown Content' })).toBeInTheDocument();
    });
  });

  it('shows a loading spinner when content is being fetched', async () => {
    (getJobFileContent as Mock).mockImplementationOnce(() => new Promise(() => {}));
    const { container } = render(<FilePreview jobId={mockJobId} files={mockFiles} />);
    fireEvent.click(screen.getByText('ATS Analysis'));

    await waitFor(() => {
      expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
    });
  });

  it('shows an error message if content fetching fails', async () => {
    (getJobFileContent as Mock).mockRejectedValueOnce(new Error('Network error'));
    render(<FilePreview jobId={mockJobId} files={mockFiles} />);
    fireEvent.click(screen.getByText('ATS Analysis'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('toggles file preview on repeated tab clicks', async () => {
    render(<FilePreview jobId={mockJobId} files={mockFiles} />);
    const atsTab = screen.getByText('ATS Analysis');

    fireEvent.click(atsTab);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Markdown Content' })).toBeInTheDocument();
    });

    fireEvent.click(atsTab);
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Markdown Content' })).not.toBeInTheDocument();
    });
  });

  it('renders JSON content correctly', async () => {
    (getJobFileContent as Mock).mockResolvedValue({
      content: JSON.stringify({ key: 'value', number: 123 }), type: 'json'
    });
    render(<FilePreview jobId={mockJobId} files={mockFiles} />);
    fireEvent.click(screen.getByText('Metadata'));

    await waitFor(() => {
      expect(screen.getByText(/"key": "value"/)).toBeInTheDocument();
    });
  });

  it('renders plain text content correctly', async () => {
    (getJobFileContent as Mock).mockResolvedValue({
      content: 'This is plain text content.', type: 'text'
    });
    render(<FilePreview jobId={mockJobId} files={mockFiles} />);
    fireEvent.click(screen.getByText('Tailored CV'));

    await waitFor(() => {
      expect(screen.getByText('This is plain text content.')).toBeInTheDocument();
    });
  });
});
