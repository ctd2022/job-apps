import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ExtractedSkillsList from '../ExtractedSkillsList';
import { ParsedEntities } from '../../types';

describe('ExtractedSkillsList', () => {
  const mockParsedEntities: ParsedEntities = {
    cv_hard_skills: ['Python', 'React', 'SQL', 'Project Management'],
    cv_soft_skills: ['Communication', 'Teamwork'], // Added to match type
    jd_required_skills: ['Python', 'SQL', 'AWS'],
    jd_preferred_skills: ['React', 'Docker'],
    cv_years_experience: 5,
    jd_years_required: 3,
  };

  it('renders without crashing when parsedEntities is provided', () => {
    render(<ExtractedSkillsList parsedEntities={mockParsedEntities} />);
    expect(screen.getByText(/Extracted Hard Skills/i)).toBeInTheDocument();
  });

  it('renders null if parsedEntities is null or undefined', () => {
    const { container } = render(<ExtractedSkillsList parsedEntities={null as any} />);
    expect(container).toBeEmptyDOMElement();
    const { container: container2 } = render(<ExtractedSkillsList parsedEntities={undefined as any} />);
    expect(container2).toBeEmptyDOMElement();
  });

  it('renders matched required skills in green', () => {
    render(<ExtractedSkillsList parsedEntities={mockParsedEntities} />);
    const skill = screen.getByText('Python').closest('li');
    expect(skill).toHaveClass('text-green-700');
  });

  it('renders matched preferred skills in yellow/amber', () => {
    render(<ExtractedSkillsList parsedEntities={mockParsedEntities} />);
    const skill = screen.getByText('React').closest('li');
    expect(skill).toHaveClass('text-yellow-700');
  });

  it('renders CV-only skills in neutral/grey', () => {
    render(<ExtractedSkillsList parsedEntities={mockParsedEntities} />);
    const skill = screen.getByText('Project Management').closest('li');
    expect(skill).toHaveClass('text-gray-600');
  });

  it('renders missing required skills in red', () => {
    render(<ExtractedSkillsList parsedEntities={mockParsedEntities} />);
    const missingSkill = screen.getByText('AWS').closest('li');
    expect(missingSkill).toHaveClass('text-red-700');
  });

  it('renders missing preferred skills in orange', () => {
    render(<ExtractedSkillsList parsedEntities={mockParsedEntities} />);
    const missingSkill = screen.getByText('Docker').closest('li');
    expect(missingSkill).toHaveClass('text-orange-700');
  });

  it('shows correct counts for required and preferred skills', () => {
    render(<ExtractedSkillsList parsedEntities={mockParsedEntities} />);
    const matchedSkillsSection = screen.getByRole('heading', { name: /Matched Skills/i }).closest('div');
    const missingSkillsSection = screen.getByRole('heading', { name: /Missing Skills \(from JD\)/i }).closest('div');

    expect(matchedSkillsSection).toHaveTextContent('Required: 2/3');
    expect(matchedSkillsSection).toHaveTextContent('Preferred: 1/2');
    expect(missingSkillsSection).toHaveTextContent('Required: 1/3');
    expect(missingSkillsSection).toHaveTextContent('Preferred: 1/2');
  });

  it('handles empty skills arrays gracefully', () => {
    const emptyParsedEntities: ParsedEntities = {
      ...mockParsedEntities,
      cv_hard_skills: [],
      jd_required_skills: [],
      jd_preferred_skills: [],
    };
    render(<ExtractedSkillsList parsedEntities={emptyParsedEntities} />);

    const matchedSkillsSection = screen.getByRole('heading', { name: /Matched Skills/i }).closest('div');
    const missingSkillsSection = screen.getByRole('heading', { name: /Missing Skills \(from JD\)/i }).closest('div');

    expect(matchedSkillsSection).toHaveTextContent('Required: 0/0');
    expect(matchedSkillsSection).toHaveTextContent('Preferred: 0/0');
    expect(missingSkillsSection).toHaveTextContent('Required: 0/0');
    expect(missingSkillsSection).toHaveTextContent('Preferred: 0/0');
    expect(screen.getAllByText('N/A')).toHaveLength(5);
  });

  it('handles case where no ATS analysis has been run (parsedEntities with empty arrays)', () => {
    const noAnalysisEntities: ParsedEntities = {
      cv_hard_skills: [],
      cv_soft_skills: [],
      jd_required_skills: [],
      jd_preferred_skills: [],
      cv_years_experience: null,
      jd_years_required: null,
    };
    render(<ExtractedSkillsList parsedEntities={noAnalysisEntities} />);
    expect(screen.getByText(/Extracted Hard Skills/i)).toBeInTheDocument();

    const matchedSkillsSection = screen.getByRole('heading', { name: /Matched Skills/i }).closest('div');
    const missingSkillsSection = screen.getByRole('heading', { name: /Missing Skills \(from JD\)/i }).closest('div');

    // Verify counts are 0/0 and lists show N/A
    expect(matchedSkillsSection).toHaveTextContent('Required: 0/0');
    expect(matchedSkillsSection).toHaveTextContent('Preferred: 0/0');
    expect(missingSkillsSection).toHaveTextContent('Required: 0/0');
    expect(missingSkillsSection).toHaveTextContent('Preferred: 0/0');
    expect(screen.getAllByText('N/A')).toHaveLength(5);
  });
});
