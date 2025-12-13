#!/usr/bin/env python3
"""
DOCX Templates Module
Generates ATS-optimized Word documents (.docx) for CVs and cover letters

CRITICAL ATS REQUIREMENTS (Non-Negotiable):
1. NO tables for layout - ATS scanners often fail to parse tables
2. Standard fonts only (Arial, Calibri, Times New Roman)
3. Simple formatting - no text boxes, headers/footers, columns, graphics
4. Clear section headers using standard headings
5. Proper heading hierarchy (H1, H2, H3)
6. Left-aligned text (except name/contact)
7. Standard bullets - simple bullet points only
8. NO images/graphics - text only
9. Keywords visible in readable text
10. Standard margins (0.75")
11. Single column layout
12. Consistent date format (Month YYYY)
"""

import re
from pathlib import Path
from datetime import datetime


def parse_markdown_cv(md_content: str) -> dict:
    """
    Parse markdown CV content into structured data for DOCX generation
    
    Returns dict with:
    - name: str
    - title: str
    - contact: list of str
    - sections: list of dict with {title, content, type}
    """
    lines = md_content.strip().split('\n')
    
    data = {
        'name': '',
        'title': '',
        'contact': [],
        'sections': []
    }
    
    current_section = None
    current_subsection = None
    
    for line in lines:
        line = line.strip()
        
        # Skip empty lines
        if not line:
            continue
        
        # H1 - Name (first one)
        if line.startswith('# ') and not data['name']:
            data['name'] = line[2:].strip()
            continue
        
        # Title/subtitle (usually bold or after name)
        if line.startswith('**') and not data['title']:
            data['title'] = line.strip('*').strip()
            continue
        
        # Contact info (emails, phones, links)
        if any(indicator in line.lower() for indicator in ['@', 'phone', 'linkedin', 'github', '|']):
            if not any(s in line for s in ['##', '###', '-', '•']):
                contact_parts = [p.strip() for p in line.split('|')]
                data['contact'].extend(contact_parts)
                continue
        
        # H2 - Major sections
        if line.startswith('## '):
            if current_section:
                data['sections'].append(current_section)
            
            current_section = {
                'title': line[3:].strip(),
                'content': [],
                'type': 'section'
            }
            current_subsection = None
            continue
        
        # H3 - Subsections (job titles, education)
        if line.startswith('### '):
            subsection_title = line[4:].strip()
            
            if current_section:
                if current_subsection:
                    current_section['content'].append(current_subsection)
                
                current_subsection = {
                    'title': subsection_title,
                    'details': [],
                    'type': 'subsection'
                }
            continue
        
        # Bullet points
        if line.startswith('- ') or line.startswith('* ') or line.startswith('• '):
            bullet_text = line[2:].strip() if line[0] in ['-', '*'] else line[1:].strip()
            
            if current_subsection:
                current_subsection['details'].append({'type': 'bullet', 'text': bullet_text})
            elif current_section:
                current_section['content'].append({'type': 'bullet', 'text': bullet_text})
            continue
        
        # Regular text (dates, locations, descriptions)
        if current_subsection:
            # Check if it's metadata (dates, locations in italics)
            if line.startswith('*') and line.endswith('*'):
                current_subsection['details'].append({'type': 'metadata', 'text': line.strip('*')})
            else:
                current_subsection['details'].append({'type': 'text', 'text': line})
        elif current_section:
            current_section['content'].append({'type': 'text', 'text': line})
    
    # Add final section
    if current_subsection and current_section:
        current_section['content'].append(current_subsection)
    if current_section:
        data['sections'].append(current_section)
    
    return data


def generate_cv_docx_node(cv_content: str, output_path: str):
    """
    Generate ATS-optimized CV in DOCX format using docx-js (Node.js)
    
    Args:
        cv_content: Markdown CV content
        output_path: Path to save .docx file
    """
    
    # Parse markdown content
    data = parse_markdown_cv(cv_content)
    
    # Escape backslashes for Windows paths in JavaScript strings
    output_path_escaped = output_path.replace('\\', '\\\\')
    
    # Generate Node.js script to create DOCX
    script = f'''
const {{ Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, LevelFormat, WidthType }} = require('docx');
const fs = require('fs');

// ATS-OPTIMIZED CV TEMPLATE
// Uses simple formatting, standard fonts, clear hierarchy
// NO tables, NO graphics, NO complex layouts

const doc = new Document({{
  styles: {{
    default: {{
      document: {{
        run: {{ font: "Calibri", size: 22 }} // 11pt body text
      }}
    }},
    paragraphStyles: [
      // Override built-in Title for name
      {{
        id: "Title",
        name: "Title",
        basedOn: "Normal",
        run: {{ size: 36, bold: true, color: "000000", font: "Calibri" }}, // 18pt
        paragraph: {{ spacing: {{ before: 0, after: 120 }}, alignment: AlignmentType.CENTER }}
      }},
      // Override Heading1 for section headers
      {{
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        run: {{ size: 28, bold: true, color: "2E3B4E", font: "Calibri" }}, // 14pt, dark gray
        paragraph: {{ 
          spacing: {{ before: 240, after: 120 }},
          outlineLevel: 0,
          border: {{ bottom: {{ color: "CCCCCC", space: 1, style: "single", size: 6 }} }} // Subtle line
        }}
      }},
      // Override Heading2 for job titles/education
      {{
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        run: {{ size: 24, bold: true, color: "000000", font: "Calibri" }}, // 12pt
        paragraph: {{ spacing: {{ before: 180, after: 60 }}, outlineLevel: 1 }}
      }},
      // Custom style for subtitle (professional title)
      {{
        id: "Subtitle",
        name: "Subtitle",
        basedOn: "Normal",
        run: {{ size: 24, color: "666666", font: "Calibri" }}, // 12pt gray
        paragraph: {{ spacing: {{ before: 60, after: 120 }}, alignment: AlignmentType.CENTER }}
      }},
      // Custom style for contact info
      {{
        id: "Contact",
        name: "Contact",
        basedOn: "Normal",
        run: {{ size: 20, color: "666666", font: "Calibri" }}, // 10pt gray
        paragraph: {{ spacing: {{ before: 0, after: 240 }}, alignment: AlignmentType.CENTER }}
      }},
      // Custom style for metadata (dates, locations)
      {{
        id: "Metadata",
        name: "Metadata",
        basedOn: "Normal",
        run: {{ size: 20, italics: true, color: "666666", font: "Calibri" }}, // 10pt gray italic
        paragraph: {{ spacing: {{ before: 0, after: 60 }} }}
      }}
    ]
  }},
  
  numbering: {{
    config: [
      {{
        reference: "cv-bullets",
        levels: [
          {{
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: {{
              paragraph: {{
                indent: {{ left: 720, hanging: 360 }} // Standard indent
              }}
            }}
          }}
        ]
      }}
    ]
  }},
  
  sections: [{{
    properties: {{
      page: {{
        margin: {{ top: 1080, right: 1080, bottom: 1080, left: 1080 }} // 0.75" margins
      }}
    }},
    children: [
      // NAME (Title style)
      new Paragraph({{
        heading: HeadingLevel.TITLE,
        children: [new TextRun("{data['name']}")]
      }}),
      
      // PROFESSIONAL TITLE (Subtitle style)
      new Paragraph({{
        style: "Subtitle",
        children: [new TextRun("{data['title']}")]
      }}),
      
      // CONTACT INFO (Contact style)
'''
    
    # Add contact information
    if data['contact']:
        contact_text = " | ".join(data['contact'])
        script += f'''
      new Paragraph({{
        style: "Contact",
        children: [new TextRun("{contact_text}")]
      }}),
'''
    
    # Add sections
    for section in data['sections']:
        # Section header (H1)
        section_title = section['title'].upper()  # ATS prefers uppercase section headers
        script += f'''
      
      // SECTION: {section_title}
      new Paragraph({{
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("{section_title}")]
      }}),
'''
        
        # Section content
        for item in section['content']:
            if item['type'] == 'subsection':
                # Subsection title (H2) - job title, education
                subsection_title = item['title'].replace('"', '\\"')
                script += f'''
      new Paragraph({{
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("{subsection_title}")]
      }}),
'''
                
                # Subsection details
                for detail in item['details']:
                    if detail['type'] == 'metadata':
                        # Dates, locations (italic gray)
                        metadata_text = detail['text'].replace('"', '\\"')
                        script += f'''
      new Paragraph({{
        style: "Metadata",
        children: [new TextRun("{metadata_text}")]
      }}),
'''
                    elif detail['type'] == 'bullet':
                        # Bullet point
                        bullet_text = detail['text'].replace('"', '\\"')
                        script += f'''
      new Paragraph({{
        numbering: {{ reference: "cv-bullets", level: 0 }},
        children: [new TextRun("{bullet_text}")]
      }}),
'''
                    elif detail['type'] == 'text':
                        # Regular text
                        text_content = detail['text'].replace('"', '\\"')
                        script += f'''
      new Paragraph({{
        children: [new TextRun("{text_content}")]
      }}),
'''
            
            elif item['type'] == 'bullet':
                # Direct bullet in section
                bullet_text = item['text'].replace('"', '\\"')
                script += f'''
      new Paragraph({{
        numbering: {{ reference: "cv-bullets", level: 0 }},
        children: [new TextRun("{bullet_text}")]
      }}),
'''
            
            elif item['type'] == 'text':
                # Regular paragraph
                text_content = item['text'].replace('"', '\\"')
                script += f'''
      new Paragraph({{
        children: [new TextRun("{text_content}")]
      }}),
'''
    
    # Close document structure
    script += f'''
    ]
  }}]
}});

// Generate and save DOCX
Packer.toBuffer(doc).then(buffer => {{
  fs.writeFileSync("{output_path_escaped}", buffer);
  console.log("✅ CV DOCX generated successfully: {output_path_escaped}");
}});
'''
    
    # Save script to temporary file
    script_path = Path(output_path).parent / "_generate_cv.js"
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(script)
    
    # Execute Node.js script
    import subprocess
    result = subprocess.run(['node', str(script_path)], capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ Error generating CV DOCX:")
        print(result.stderr)
        raise RuntimeError(f"DOCX generation failed: {result.stderr}")
    
    # Clean up script
    script_path.unlink()
    
    print(f"✅ ATS-optimized CV created: {output_path}")


def generate_cover_letter_docx_node(letter_content: str, output_path: str, applicant_name: str = None):
    """
    Generate ATS-optimized cover letter in DOCX format
    
    Args:
        letter_content: Plain text cover letter
        output_path: Path to save .docx file
        applicant_name: Applicant's name (extracted from content if not provided)
    """
    
    # Parse cover letter structure
    lines = [line.strip() for line in letter_content.strip().split('\n') if line.strip()]
    
    # Try to extract name if not provided
    if not applicant_name:
        # Look for signature line
        for i, line in enumerate(lines):
            if line.lower().startswith(('sincerely', 'best regards', 'kind regards', 'yours')):
                if i + 1 < len(lines):
                    applicant_name = lines[i + 1]
                    break
    
    # Escape backslashes for Windows paths in JavaScript strings
    output_path_escaped = output_path.replace('\\', '\\\\')
    
    # Generate Node.js script
    script = f'''
const {{ Document, Packer, Paragraph, TextRun, AlignmentType }} = require('docx');
const fs = require('fs');

// ATS-OPTIMIZED COVER LETTER TEMPLATE
// Professional formatting suitable for ATS parsing

const doc = new Document({{
  styles: {{
    default: {{
      document: {{
        run: {{ font: "Calibri", size: 22 }} // 11pt
      }}
    }},
    paragraphStyles: [
      {{
        id: "ContactInfo",
        name: "Contact Info",
        basedOn: "Normal",
        run: {{ size: 22, font: "Calibri" }},
        paragraph: {{ spacing: {{ before: 0, after: 60 }} }}
      }},
      {{
        id: "Date",
        name: "Date",
        basedOn: "Normal",
        run: {{ size: 22, font: "Calibri" }},
        paragraph: {{ spacing: {{ before: 120, after: 120 }} }}
      }},
      {{
        id: "BodyParagraph",
        name: "Body Paragraph",
        basedOn: "Normal",
        run: {{ size: 22, font: "Calibri" }},
        paragraph: {{ spacing: {{ before: 0, after: 120 }} }}
      }},
      {{
        id: "Closing",
        name: "Closing",
        basedOn: "Normal",
        run: {{ size: 22, font: "Calibri" }},
        paragraph: {{ spacing: {{ before: 120, after: 60 }} }}
      }}
    ]
  }},
  
  sections: [{{
    properties: {{
      page: {{
        margin: {{ top: 1440, right: 1440, bottom: 1440, left: 1440 }} // 1" margins
      }}
    }},
    children: [
'''
    
    # Add content paragraphs
    in_closing = False
    
    for line in lines:
        line_escaped = line.replace('"', '\\"').replace("'", "\\'")
        
        # Detect closing
        if line.lower().startswith(('sincerely', 'best regards', 'kind regards', 'yours')):
            in_closing = True
            script += f'''
      new Paragraph({{
        style: "Closing",
        children: [new TextRun("{line_escaped}")]
      }}),
'''
        elif in_closing:
            # Signature line (name)
            script += f'''
      new Paragraph({{
        style: "Closing",
        children: [new TextRun({{ text: "{line_escaped}", bold: true }})]
      }}),
'''
            in_closing = False
        else:
            # Regular paragraph
            script += f'''
      new Paragraph({{
        style: "BodyParagraph",
        children: [new TextRun("{line_escaped}")]
      }}),
'''
    
    # Close document
    script += f'''
    ]
  }}]
}});

// Generate and save DOCX
Packer.toBuffer(doc).then(buffer => {{
  fs.writeFileSync("{output_path_escaped}", buffer);
  console.log("✅ Cover letter DOCX generated successfully: {output_path_escaped}");
}});
'''
    
    # Save and execute script
    script_path = Path(output_path).parent / "_generate_cover_letter.js"
    with open(script_path, 'w', encoding='utf-8') as f:
        f.write(script)
    
    import subprocess
    result = subprocess.run(['node', str(script_path)], capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"❌ Error generating cover letter DOCX:")
        print(result.stderr)
        raise RuntimeError(f"DOCX generation failed: {result.stderr}")
    
    # Clean up
    script_path.unlink()
    
    print(f"✅ ATS-optimized cover letter created: {output_path}")


def main():
    """Test the DOCX generation"""
    print("DOCX Templates Module - ATS Optimized")
    print("=" * 60)
    print("This module generates professional .docx files")
    print("optimized for Applicant Tracking Systems (ATS)")
    print("=" * 60)


if __name__ == "__main__":
    main()
