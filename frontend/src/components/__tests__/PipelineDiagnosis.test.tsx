import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, Mock, beforeEach } from 'vitest';
import PipelineDiagnosis from '../PipelineDiagnosis';
import { getPipelineDiagnosis } from '../../api';

// Mock the API calls
vi.mock('../../api'); // Vitest will automatically mock all exports as vi.fn()

describe('PipelineDiagnosis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders null initially while loading', () => {
    (getPipelineDiagnosis as Mock).mockImplementationOnce(() => new Promise(() => {})); // Never resolve to simulate loading
    const { container } = render(<PipelineDiagnosis />);
    expect(container.firstChild).toBeNull();
  });

  it('renders diagnosis data when API call is successful (healthy)', async () => {
    const mockDiagnosis = {
      diagnosis: 'Pipeline is healthy',
      advice: 'All systems go.',
    };
    (getPipelineDiagnosis as Mock).mockResolvedValueOnce(mockDiagnosis);

    const { container } = render(<PipelineDiagnosis />);

    await waitFor(() => {
      expect(screen.getByText(mockDiagnosis.diagnosis)).toBeInTheDocument();
      expect(screen.getByText(mockDiagnosis.advice)).toBeInTheDocument();
      expect(container.querySelector('svg.text-green-500')).toBeInTheDocument(); // CheckCircle icon
    });
  });

  it('renders diagnosis data when API call is successful (low)', async () => {
    const mockDiagnosis = {
      diagnosis: 'Pipeline is low',
      advice: 'Consider checking connections.',
    };
    (getPipelineDiagnosis as Mock).mockResolvedValueOnce(mockDiagnosis);

    const { container } = render(<PipelineDiagnosis />);

    await waitFor(() => {
      expect(screen.getByText(mockDiagnosis.diagnosis)).toBeInTheDocument();
      expect(screen.getByText(mockDiagnosis.advice)).toBeInTheDocument();
      expect(container.querySelector('svg.text-yellow-500')).toBeInTheDocument(); // AlertTriangle icon
    });
  });

  it('renders diagnosis data when API call is successful (default icon)', async () => {
    const mockDiagnosis = {
      diagnosis: 'Some other status',
      advice: 'Generic advice.',
    };
    (getPipelineDiagnosis as Mock).mockResolvedValueOnce(mockDiagnosis);

    const { container } = render(<PipelineDiagnosis />);

    await waitFor(() => {
      expect(screen.getByText(mockDiagnosis.diagnosis)).toBeInTheDocument();
      expect(screen.getByText(mockDiagnosis.advice)).toBeInTheDocument();
      expect(container.querySelector('svg.text-blue-500')).toBeInTheDocument(); // Lightbulb icon
    });
  });

  it('renders null if diagnosis data is empty after loading', async () => {
    (getPipelineDiagnosis as Mock).mockResolvedValueOnce(null);

    const { container } = render(<PipelineDiagnosis />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders null if API call fails', async () => {
    (getPipelineDiagnosis as Mock).mockRejectedValueOnce(new Error('API down'));

    const { container } = render(<PipelineDiagnosis />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
