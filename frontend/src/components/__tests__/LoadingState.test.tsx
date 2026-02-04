
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingState, { SkeletonCard, SkeletonList } from '../LoadingState';

describe('LoadingState', () => {
  it('renders default loading message', () => {
    render(<LoadingState />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<LoadingState message="Please wait" />);
    expect(screen.getByText('Please wait')).toBeInTheDocument();
  });

  it('renders fullPage wrapper', () => {
    const { container } = render(<LoadingState fullPage={true} />);
    expect(container.firstChild).toHaveClass('min-h-[400px]');
  });

  it('SkeletonCard renders', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('SkeletonList renders correct count', () => {
    const { container } = render(<SkeletonList count={5} />);
    expect(container.querySelectorAll('.animate-pulse').length).toBe(5);
  });
});
