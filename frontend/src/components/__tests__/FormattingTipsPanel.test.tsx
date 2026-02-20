import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FormattingTipsPanel from '../FormattingTipsPanel';

describe('FormattingTipsPanel', () => {
  it('renders null when there are no tips', () => {
    const content = `
      John Doe
      johndoe@example.com
      Experience
      Education
      Skills
      2020-2023
      This is a well-formatted CV content. It contains more than 500 characters but less than 8000.
      It avoids tables, multiple columns, and has standard headings, contact info, and dates.
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
      Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
      Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
      Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
      Another paragraph to ensure length is sufficient and no bullet point tip is triggered.
    `;
    const { container } = render(<FormattingTipsPanel content={content} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows table warning when content contains markdown table syntax', () => {
    const content = `
      | Header 1 | Header 2 |
      |----------|----------|
      | Data 1   | Data 2   |
      johndoe@example.com
      Experience
      Education
      Skills
      2020-2023
      Short content, less than 500 characters.
    `; // Expects: no-tables (warning), cv-length-short (warning)
    render(<FormattingTipsPanel content={content} />);
    expect(screen.getByText('Tables may not parse correctly in ATS systems')).toBeInTheDocument();
    expect(screen.getByText('CV seems short - ATS may flag incomplete applications')).toBeInTheDocument();
    expect(screen.getByText('Formatting Tips (2)')).toBeInTheDocument();
    expect(screen.getByText('2 Warnings')).toBeInTheDocument();
  });

  it('shows contact warning when no email address is detected', () => {
    const content = `
      John Doe
      Experience
      Education
      Skills
      2020-2023
      This is content without an email address. It is also quite short, less than 500 characters.
    `; // Expects: has-contact (warning), cv-length-short (warning)
    render(<FormattingTipsPanel content={content} />);
    expect(screen.getByText('No email address detected - ensure contact info is included')).toBeInTheDocument();
    expect(screen.getByText('CV seems short - ATS may flag incomplete applications')).toBeInTheDocument();
    expect(screen.getByText('Formatting Tips (2)')).toBeInTheDocument();
    expect(screen.getByText('2 Warnings')).toBeInTheDocument();
  });

  it('shows length warning when content is less than 500 characters', () => {
    const content = `
      John Doe
      johndoe@example.com
      Experience
      Education
      Skills
      2020-2023
      Short content.
    `; // Expects: cv-length-short (warning)
    render(<FormattingTipsPanel content={content} />);
    expect(screen.getByText('CV seems short - ATS may flag incomplete applications')).toBeInTheDocument();
    expect(screen.getByText('Formatting Tips (1)')).toBeInTheDocument();
    expect(screen.getByText('1 Warning')).toBeInTheDocument();
  });

  it('shows length info when content is greater than 8000 characters', () => {
    const longContent = 'a'.repeat(8500) + `
      John Doe
      johndoe@example.com
      Experience
      Education
      Skills
      2020-2023
    `; // Expects: cv-length-long (info)
    render(<FormattingTipsPanel content={longContent} />);
    expect(screen.getByText('CV is quite long - consider condensing to 2 pages')).toBeInTheDocument();
    expect(screen.getByText('Formatting Tips (1)')).toBeInTheDocument();
    expect(screen.getByText('1 Info')).toBeInTheDocument();
  });

  it('shows multiple tips and correct counts in the header', () => {
    const content = `
      | Header 1 | Header 2 |
      |----------|----------|
      | Data 1   | Data 2   |
      John Doe
      Short content with no email and no dates.
      Experience
      Education
      Skills
    `; // Expects: no-tables (warning), has-contact (warning), cv-length-short (warning), has-dates (info)
    render(<FormattingTipsPanel content={content} />);

    expect(screen.getByText('Tables may not parse correctly in ATS systems')).toBeInTheDocument();
    expect(screen.getByText('No email address detected - ensure contact info is included')).toBeInTheDocument();
    expect(screen.getByText('CV seems short - ATS may flag incomplete applications')).toBeInTheDocument();
    expect(screen.getByText('Add dates to your experience entries for better parsing')).toBeInTheDocument();

    expect(screen.getByText('Formatting Tips (4)')).toBeInTheDocument();
    expect(screen.getByText('3 Warnings')).toBeInTheDocument();
    expect(screen.getByText('1 Info')).toBeInTheDocument();
  });

  it('toggles panel expansion when header is clicked', () => {
    const content = `
      John Doe
      Short content.
      No email.
      2020-2023
      Experience
      Education
      Skills
    `;
    render(<FormattingTipsPanel content={content} />);

    const header = screen.getByText(/Formatting Tips/);
    expect(screen.getByText('CV seems short - ATS may flag incomplete applications')).toBeVisible();

    fireEvent.click(header);
    expect(screen.queryByText('CV seems short - ATS may flag incomplete applications')).not.toBeInTheDocument();

    fireEvent.click(header);
    expect(screen.getByText('CV seems short - ATS may flag incomplete applications')).toBeVisible();
  });

  it('shows bullet points tip for long paragraphs without newlines', () => {
    const longParagraph = 'word '.repeat(301).trim();
    const content = `
      johndoe@example.com
      Experience
      Education
      Skills
      2020-2023

      ${longParagraph}

    `; // Expects: bullet-points (info)
    render(<FormattingTipsPanel content={content} />);
    expect(screen.getByText('Consider using bullet points instead of long paragraphs')).toBeInTheDocument();
    expect(screen.getByText('Formatting Tips (1)')).toBeInTheDocument();
    expect(screen.getByText('1 Info')).toBeInTheDocument();
  });

  it('shows column layout warning for tab-separated content', () => {
    const content = `
      johndoe@example.com
      Experience\t2020-2023\tLocation
      Role\tCompany\tDates
      Education
      Skills
      Short content, less than 500 characters.
    `; // Expects: no-columns (warning), cv-length-short (warning)
    render(<FormattingTipsPanel content={content} />);
    expect(screen.getByText('Multi-column layouts can confuse ATS parsers')).toBeInTheDocument();
    expect(screen.getByText('CV seems short - ATS may flag incomplete applications')).toBeInTheDocument();
    expect(screen.getByText('Formatting Tips (2)')).toBeInTheDocument();
    expect(screen.getByText('2 Warnings')).toBeInTheDocument();
  });
});
