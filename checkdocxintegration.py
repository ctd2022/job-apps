#!/usr/bin/env python3
"""
Quick diagnostic - Check if DOCX integration is ready in src/
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

print("="*70)
print("DOCX INTEGRATION DIAGNOSTIC")
print("="*70)

# Check files exist
src_dir = Path("src")
workflow_file = src_dir / "job_application_workflow.py"
docx_file = src_dir / "docx_templates.py"

print(f"\n[1] Checking file structure...")
if workflow_file.exists():
    print(f"  ✓ {workflow_file} exists")
else:
    print(f"  ✗ {workflow_file} NOT FOUND")

if docx_file.exists():
    print(f"  ✓ {docx_file} exists")
else:
    print(f"  ✗ {docx_file} NOT FOUND")

# Check workflow has DOCX integration
print(f"\n[2] Checking workflow file for DOCX integration...")
if workflow_file.exists():
    with open(workflow_file, 'r', encoding='utf-8') as f:
        workflow_content = f.read()
    
    checks = {
        "DOCX generation code": "Generating professional DOCX files" in workflow_content,
        "CV DOCX function": "generate_cv_docx_node" in workflow_content,
        "Cover letter DOCX function": "generate_cover_letter_docx_node" in workflow_content,
        "Path escaping fix": "output_path_escaped" in workflow_content or "replace('\\\\'," in workflow_content
    }
    
    for check, result in checks.items():
        if result:
            print(f"  ✓ {check}")
        else:
            print(f"  ✗ {check} - MISSING")

# Check docx_templates has fixes
print(f"\n[3] Checking docx_templates.py for Windows path fix...")
if docx_file.exists():
    with open(docx_file, 'r', encoding='utf-8') as f:
        docx_content = f.read()
    
    if "output_path_escaped" in docx_content:
        print(f"  ✓ Windows path escaping is present")
    else:
        print(f"  ✗ Windows path escaping MISSING - DOCX generation will fail!")
        print(f"    You need to replace src/docx_templates.py with the fixed version")

# Try to import
print(f"\n[4] Testing imports...")
try:
    from docx_templates import generate_cv_docx_node, generate_cover_letter_docx_node
    print(f"  ✓ docx_templates imports successfully")
except ImportError as e:
    print(f"  ✗ Import failed: {e}")

print("\n" + "="*70)
print("RECOMMENDATION")
print("="*70)

if workflow_file.exists() and docx_file.exists():
    # Check if workflow needs updating
    needs_update = False
    
    if "generate_cv_docx_node" not in workflow_content:
        print("\n⚠️  Your src/job_application_workflow.py needs DOCX integration!")
        print("   Replace it with the updated version provided.")
        needs_update = True
    
    if "output_path_escaped" not in docx_content:
        print("\n⚠️  Your src/docx_templates.py needs the Windows path fix!")
        print("   Replace it with the fixed version provided.")
        needs_update = True
    
    if not needs_update:
        print("\n✓ All files are up to date!")
        print("\nYour workflow should generate DOCX files automatically.")
        print("\nRun:")
        print("  python scripts/run_workflow.py --cv inputs/test_cv.txt --job inputs/job_descriptions/test_job.txt --company TechCorp --backend ollama")
else:
    print("\n✗ Missing required files in src/ folder")
    print("  Make sure both files are in src/:")
    print("  - job_application_workflow.py (updated with DOCX integration)")
    print("  - docx_templates.py (with Windows path fix)")

print("\n" + "="*70)
