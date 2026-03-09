/**
 * Shared Pull-from-Profile logic.
 *
 * Applies assembled profile sections to the current CV text idempotently.
 * Contact header is always prepended; other sections replace their existing
 * header block or are appended in order.
 *
 * PII note: contact_header contains real name/email/phone. This is intentional —
 * the CV editor holds the working copy. The backend scrubs PII before any LLM
 * call (pii_scrubber.py) and restores it after.
 */

export interface AssembledSections {
  contact_header: string;
  summary_text: string;
  experience_text: string;
  education_text: string;
  certifications_text: string;
  skills_text: string;
  professional_development_text: string;
}

/** Strip the CONTACT_START/END marker block (idempotent). */
export function stripContactHeader(text: string): string {
  return text.replace(/<!-- CONTACT_START -->[\s\S]*?<!-- CONTACT_END -->\n*/g, '');
}

/**
 * Replace the section identified by headerPattern with sectionText,
 * or append it if the section doesn't exist yet.
 * sectionText must include its own ## heading line.
 */
function replaceOrAppendSection(
  text: string,
  sectionText: string,
  headerPattern: RegExp,
): string {
  if (!sectionText?.trim()) return text;

  const lines = text.split('\n');
  const idx = lines.findIndex(l => headerPattern.test(l.trim()));

  if (idx === -1) {
    return text.trimEnd() + '\n\n' + sectionText;
  }

  let nextSection = lines.length;
  for (let i = idx + 1; i < lines.length; i++) {
    if (/^#{1,3}\s/.test(lines[i])) {
      nextSection = i;
      break;
    }
  }

  const before = lines.slice(0, idx);
  const after = lines.slice(nextSection);
  return [...before, sectionText, '', ...after].join('\n');
}

/** Apply all assembled profile sections to the current CV text. */
export function applyProfileSections(
  currentText: string,
  sections: AssembledSections,
): string {
  const {
    contact_header,
    summary_text,
    experience_text,
    education_text,
    certifications_text,
    skills_text,
    professional_development_text,
  } = sections;

  let text = stripContactHeader(currentText);

  text = replaceOrAppendSection(text, summary_text,
    /^(#{1,3}\s*)?(professional\s+)?summary\s*$|^(#{1,3}\s*)?profile\s*$/i);

  text = replaceOrAppendSection(text, experience_text,
    /^#{1,3}\s*(work\s+)?experience\s*$/i);

  text = replaceOrAppendSection(text, education_text,
    /^#{1,3}\s*education(\s+&\s+training)?\s*$/i);

  text = replaceOrAppendSection(text, certifications_text,
    /^#{1,3}\s*(certifications?|licen[cs]es?(\s*[&/]\s*certifications?)?)\s*$/i);

  text = replaceOrAppendSection(text, skills_text,
    /^#{1,3}\s*(technical\s+|key\s+)?skills?\s*$/i);

  text = replaceOrAppendSection(text, professional_development_text,
    /^#{1,3}\s*professional\s+(development|training)\s*$/i);

  // Contact header always goes at the top
  if (contact_header) {
    text = contact_header + '\n\n' + text.trimStart();
  }

  return text;
}
