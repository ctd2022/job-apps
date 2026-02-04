
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CollapsibleSection from '../CollapsibleSection';

describe('CollapsibleSection', () => {
  it('renders title', () => {
    render(
      <CollapsibleSection title="Test Section">
        <p>Content</p>
      </CollapsibleSection>
    );
    expect(screen.getByText('Test Section')).toBeInTheDocument();
  });

  it('children hidden by default', () => {
    render(
      <CollapsibleSection title="Test Section">
        <p>Content</p>
      </CollapsibleSection>
    );
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('children visible when defaultExpanded', () => {
    render(
      <CollapsibleSection title="Test Section" defaultExpanded={true}>
        <p>Content</p>
      </CollapsibleSection>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('toggles children on click', () => {
    render(
      <CollapsibleSection title="Test Section">
        <p>Content</p>
      </CollapsibleSection>
    );
    expect(screen.queryByText('Content')).not.toBeInTheDocument();

    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(screen.getByText('Content')).toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders badge when provided', () => {
    render(
      <CollapsibleSection title="Test Section" badge={5}>
        <p>Content</p>
      </CollapsibleSection>
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
