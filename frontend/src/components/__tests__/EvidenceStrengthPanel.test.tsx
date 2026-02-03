import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import EvidenceStrengthPanel from '../EvidenceStrengthPanel';
import type { EvidenceAnalysis, EvidenceGaps } from '../../types';

describe('EvidenceStrengthPanel', () => {
  const mockEvidenceAnalysis: EvidenceAnalysis = {
    strong_evidence_count: 5,
    moderate_evidence_count: 2,
    weak_evidence_count: 1,
    average_strength: 0.75,
    strong_skills: ['Python', 'AWS', 'React', 'SQL', 'TypeScript'],
    weak_skills: ['Docker'],
  };

  const mockEvidenceGaps: EvidenceGaps = {
    weak_evidence_skills: ['GCP', 'Azure'],
  };

  it('renders without crashing', () => {
    render(<EvidenceStrengthPanel evidenceAnalysis={mockEvidenceAnalysis} />);
    expect(screen.getByText(/Evidence Strength/i)).toBeInTheDocument();
  });

  it('renders null if evidenceAnalysis is null or undefined', () => {
    const { container } = render(<EvidenceStrengthPanel evidenceAnalysis={null as any} />);
    expect(container).toBeEmptyDOMElement();
    const { container: container2 } = render(<EvidenceStrengthPanel evidenceAnalysis={undefined as any} />);
    expect(container2).toBeEmptyDOMElement();
  });

  it('renders strong, moderate, and weak evidence counts and percentages in the summary bar', () => {
    render(<EvidenceStrengthPanel evidenceAnalysis={mockEvidenceAnalysis} />);

    expect(screen.getByText('75% Average Strength')).toBeInTheDocument();
    expect(screen.getByText(/Strong \(5\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Moderate \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Weak \(1\)/i)).toBeInTheDocument();
  });

  it('renders average strength as a percentage with correct color coding', () => {
    const { rerender } = render(<EvidenceStrengthPanel evidenceAnalysis={{ ...mockEvidenceAnalysis, average_strength: 0.85 }} />);
    expect(screen.getByText('85% Average Strength')).toHaveClass('text-green-600');

    rerender(<EvidenceStrengthPanel evidenceAnalysis={{ ...mockEvidenceAnalysis, average_strength: 0.60 }} />);
    expect(screen.getByText('60% Average Strength')).toHaveClass('text-yellow-600');

    rerender(<EvidenceStrengthPanel evidenceAnalysis={{ ...mockEvidenceAnalysis, average_strength: 0.30 }} />);
    expect(screen.getByText('30% Average Strength')).toHaveClass('text-red-600');
  });

  it('renders strong skills list in green', () => {
    render(<EvidenceStrengthPanel evidenceAnalysis={mockEvidenceAnalysis} />);
    expect(screen.getByText('Python')).toHaveClass('text-green-700');
    expect(screen.getByText('AWS')).toHaveClass('text-green-700');
  });

  it('renders weak skills with suggestion text in red', () => {
    render(<EvidenceStrengthPanel evidenceAnalysis={mockEvidenceAnalysis} />);
    expect(screen.getByText('Docker:')).toBeInTheDocument();
    const dockerSkillItem = screen.getByText('Docker:').closest('li');
    expect(dockerSkillItem).toBeInTheDocument();
    expect(dockerSkillItem).toHaveClass('text-red-700');
    expect(dockerSkillItem).toHaveTextContent('Docker: Add metrics or context to strengthen evidence.');
  });

  it('merges weak_skills and evidenceGaps.weak_evidence_skills for suggestions', () => {
    render(<EvidenceStrengthPanel evidenceAnalysis={mockEvidenceAnalysis} evidenceGaps={mockEvidenceGaps} />);
    expect(screen.getByText('Docker:')).toBeInTheDocument();
    expect(screen.getByText('GCP:')).toBeInTheDocument();
    expect(screen.getByText('Azure:')).toBeInTheDocument();
    expect(screen.getAllByText(/Add metrics or context to strengthen evidence./i)).toHaveLength(3);
  });

  it('handles zero counts gracefully in the summary bar', () => {
    const zeroEvidence: EvidenceAnalysis = {
      strong_evidence_count: 0,
      moderate_evidence_count: 0,
      weak_evidence_count: 0,
      average_strength: 0,
      strong_skills: [],
      weak_skills: [],
    };
    render(<EvidenceStrengthPanel evidenceAnalysis={zeroEvidence} />);
    expect(screen.getByText('0% Average Strength')).toBeInTheDocument();
    expect(screen.getByText('Strong (0)')).toBeInTheDocument();
    expect(screen.getByText('Moderate (0)')).toBeInTheDocument();
    expect(screen.getByText('Weak (0)')).toBeInTheDocument();
    expect(screen.getByText(/No skills identified as needing stronger evidence./i)).toBeInTheDocument();
    expect(screen.getAllByText('N/A')).toHaveLength(1);
  });

  it('handles missing evidenceGaps prop gracefully', () => {
    render(<EvidenceStrengthPanel evidenceAnalysis={mockEvidenceAnalysis} />);
    expect(screen.getByText('Docker:')).toBeInTheDocument();
    expect(screen.queryByText('GCP:')).not.toBeInTheDocument();
    expect(screen.queryByText('Azure:')).not.toBeInTheDocument();
  });
});