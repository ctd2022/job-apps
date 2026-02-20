import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, Mock, beforeEach } from 'vitest';
import CVManager from './CVManager';
import { getCVs, createCV, deleteCV, setDefaultCV, renameCV, getCVVersions, getCV, updateCVContent } from '../api';
import type { StoredCV, CVVersion } from '../types';

vi.mock('../api', () => ({
  getCVs: vi.fn(),
  createCV: vi.fn(),
  deleteCV: vi.fn(),
  setDefaultCV: vi.fn(),
  renameCV: vi.fn(),
  getCVVersions: vi.fn(),
  getCV: vi.fn(),
  updateCVContent: vi.fn(),
}));

const mockCVs: StoredCV[] = [
  {
    id: 1,
    name: 'My CV',
    filename: 'my_cv.pdf',
    is_default: true,
    created_at: '2023-01-01T12:00:00Z',
    version_number: 2,
    version_count: 2,
  },
  {
    id: 2,
    name: 'Another CV',
    filename: 'another_cv.txt',
    is_default: false,
    created_at: '2023-02-01T12:00:00Z',
    version_number: 1,
    version_count: 1,
  },
];

const mockVersions: CVVersion[] = [
  {
    id: 101,
    cv_id: 1,
    version_number: 1,
    filename: 'my_cv_v1.pdf',
    change_summary: 'Initial upload',
    created_at: '2023-01-01T12:00:00Z',
  },
  {
    id: 102,
    cv_id: 1,
    version_number: 2,
    filename: 'my_cv_v2.pdf',
    change_summary: 'Updated skills',
    created_at: '2023-01-15T12:00:00Z',
  },
];

describe('CVManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCVs as Mock).mockResolvedValue(mockCVs);
    (getCVVersions as Mock).mockResolvedValue(mockVersions);
    (getCV as Mock).mockResolvedValue({
      id: 1,
      name: 'My CV',
      content: 'CV content here',
      is_default: true,
      filename: 'my_cv.pdf',
      created_at: '2023-01-01T12:00:00Z',
    });
    (createCV as Mock).mockResolvedValue({});
    (renameCV as Mock).mockResolvedValue({});
    (deleteCV as Mock).mockResolvedValue({});
    (setDefaultCV as Mock).mockResolvedValue({});
    (updateCVContent as Mock).mockResolvedValue({});
  });

  it('renders loading state initially', () => {
    (getCVs as Mock).mockReturnValueOnce(new Promise(() => {})); // Never resolve
    const { container } = render(<CVManager />);
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('renders CVs after loading', async () => {
    render(<CVManager />);
    await waitFor(() => {
      expect(screen.getByText('My CV')).toBeInTheDocument();
      expect(screen.getByText('Another CV')).toBeInTheDocument();
      expect(screen.getByText('Default')).toBeInTheDocument();
    });
  });

  it('renders empty state when no CVs are available', async () => {
    (getCVs as Mock).mockResolvedValueOnce([]);
    render(<CVManager />);
    await waitFor(() => {
      expect(screen.getByText('No CVs uploaded yet. Click "Upload CV" to get started.')).toBeInTheDocument();
    });
  });

  it('shows and hides the upload CV form', async () => {
    render(<CVManager />);
    await waitFor(() => expect(screen.getByText('My CV')).toBeInTheDocument());

    const uploadButton = screen.getByRole('button', { name: /Upload CV/i });
    fireEvent.click(uploadButton);
    expect(screen.getByText('Upload New CV')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('CV name...')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);
    await waitFor(() => expect(screen.queryByText('Upload New CV')).not.toBeInTheDocument());
  });

  it('handles CV upload successfully', async () => {
    render(<CVManager />);
    await waitFor(() => expect(screen.getByText('My CV')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Upload CV/i }));

    const chooseFileButton = screen.getByRole('button', { name: /Choose file/i });
    fireEvent.click(chooseFileButton);

    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/Set as default/i).closest('label')?.previousElementSibling?.previousElementSibling?.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.change(screen.getByPlaceholderText('CV name...'), { target: { value: 'New Test CV' } });
    fireEvent.click(screen.getByLabelText(/Set as default/i));

    const uploadForm = screen.getByRole('heading', { name: /Upload New CV/i }).closest('div.bg-white'); // Or a more specific container class if available
    fireEvent.click(within(uploadForm! as HTMLElement).getByRole('button', { name: /Upload/i }));

    await waitFor(() => {
      expect(createCV).toHaveBeenCalledWith(file, 'New Test CV', true);
      expect(getCVs).toHaveBeenCalledTimes(2); // Initial load + after upload
      expect(screen.queryByText('Upload New CV')).not.toBeInTheDocument();
    });
  });

  it('handles rename functionality', async () => {
    render(<CVManager />);
    await waitFor(() => expect(screen.getByText('My CV')).toBeInTheDocument());

    const renameButton = screen.getAllByRole('button', { name: 'Rename' })[0];
    fireEvent.click(renameButton);

    const renameInput = screen.getByDisplayValue('My CV');
    fireEvent.change(renameInput, { target: { value: 'My Renamed CV' } });
    const renameContainer = renameInput.closest('div.flex.items-center.space-x-1');
    const confirmButton = within(renameContainer! as HTMLElement).getAllByRole('button')[0];
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(renameCV).toHaveBeenCalledWith(1, 'My Renamed CV');
      expect(getCVs).toHaveBeenCalledTimes(2);
    });
  });
});