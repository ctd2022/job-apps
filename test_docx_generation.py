#!/usr/bin/env python3
"""
Test DOCX Generation
Quick test to verify DOCX creation works before running full workflow
"""

import sys
from pathlib import Path

# Add src directory to Python path
sys.path.insert(0, str(Path(__file__).parent / "src"))

# Test CV content
test_cv_markdown = """# John Smith
Senior Software Engineer

Email: john.smith@email.com | Phone: +44 7700 900000

## PROFESSIONAL SUMMARY
Experienced software engineer with 8+ years in full-stack development.

## WORK EXPERIENCE

### Senior Software Engineer | Tech Solutions Ltd
*London, UK | January 2020 - Present*

- Led development of microservices architecture serving 1M+ users
- Implemented CI/CD pipelines reducing deployment time by 60%
- Mentored team of 5 junior developers

### Software Engineer | Digital Innovations Inc
*Manchester, UK | June 2016 - December 2019*

- Developed RESTful APIs for e-commerce platform
- Improved application performance by 40%

## SKILLS
Python, JavaScript, Django, React, AWS, Docker, Kubernetes

## EDUCATION

### BSc Computer Science
*University of Manchester | 2012 - 2016*
Grade: First Class Honours
"""

# Test cover letter content
test_cover_letter = """Dear Hiring Manager,

I am writing to express my interest in the Python Developer position at TechCorp. With over 8 years of experience in full-stack development, I am confident in my ability to contribute to your team.

In my current role at Tech Solutions Ltd, I led the development of a microservices architecture serving over 1 million users. I successfully implemented CI/CD pipelines that reduced deployment time by 60%, demonstrating my expertise in both development and DevOps practices.

I am particularly excited about this opportunity because of TechCorp's innovative approach to fintech. My experience with Python, AWS, and containerization aligns perfectly with your requirements.

Thank you for considering my application. I look forward to discussing how I can contribute to TechCorp's success.

Sincerely,
John Smith"""

print("="*70)
print("DOCX GENERATION TEST")
print("="*70)

# Check if docx_templates exists in src/
docx_templates_path = Path('src/docx_templates.py')
if not docx_templates_path.exists():
    print("\n❌ ERROR: src/docx_templates.py not found!")
    print("\nYou need to:")
    print("  1. Download docx_templates.py from the provided files")
    print("  2. Place it in the src/ directory")
    print(f"  3. Expected location: {docx_templates_path.absolute()}")
    sys.exit(1)

print(f"\n✓ docx_templates.py found at: {docx_templates_path}")

# Try to import
try:
    from docx_templates import generate_cv_docx_node, generate_cover_letter_docx_node
    print("✓ Successfully imported docx_templates functions")
except ImportError as e:
    print(f"\n❌ Import failed: {e}")
    print("\nMake sure docx_templates.py is in the src/ folder")
    sys.exit(1)

# Create test output directory
output_dir = Path('test_docx_output')
output_dir.mkdir(exist_ok=True)
print(f"✓ Output directory: {output_dir.absolute()}")

# Test CV DOCX generation
print("\n[TEST 1] Generating CV DOCX...")
cv_output = output_dir / 'test_cv.docx'
try:
    generate_cv_docx_node(test_cv_markdown, str(cv_output))
    if cv_output.exists():
        size = cv_output.stat().st_size
        print(f"  ✓ CV DOCX created successfully!")
        print(f"  ✓ File size: {size:,} bytes")
        print(f"  ✓ Location: {cv_output.absolute()}")
    else:
        print("  ❌ File was not created")
except Exception as e:
    print(f"  ❌ Error: {e}")
    import traceback
    traceback.print_exc()

# Test Cover Letter DOCX generation
print("\n[TEST 2] Generating Cover Letter DOCX...")
letter_output = output_dir / 'test_cover_letter.docx'
try:
    generate_cover_letter_docx_node(test_cover_letter, str(letter_output), "John Smith")
    if letter_output.exists():
        size = letter_output.stat().st_size
        print(f"  ✓ Cover Letter DOCX created successfully!")
        print(f"  ✓ File size: {size:,} bytes")
        print(f"  ✓ Location: {letter_output.absolute()}")
    else:
        print("  ❌ File was not created")
except Exception as e:
    print(f"  ❌ Error: {e}")
    import traceback
    traceback.print_exc()

# Summary
print("\n" + "="*70)
print("TEST COMPLETE")
print("="*70)

if cv_output.exists() and letter_output.exists():
    print("\n✓ SUCCESS! DOCX generation is working!")
    print("\nGenerated files:")
    print(f"  - {cv_output}")
    print(f"  - {letter_output}")
    print("\nYou can now:")
    print("  1. Open these files in Microsoft Word or Google Docs")
    print("  2. Verify they look professional and ATS-friendly")
    print("  3. Run the full workflow with confidence!")
    print("\nTo run full workflow:")
    print("  python scripts/run_workflow.py --cv inputs/test_cv.txt --job inputs/job_descriptions/test_job.txt --company TechCorp --backend ollama")
else:
    print("\n❌ DOCX generation failed")
    print("Check the error messages above for details")

print("\n" + "="*70)
