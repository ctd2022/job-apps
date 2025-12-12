#!/usr/bin/env python3
"""
Simple CLI interface for the job application workflow
"""

import argparse
from pathlib import Path
from job_application_workflow import JobApplicationWorkflow

def main():
    parser = argparse.ArgumentParser(
        description='Local Job Application Workflow - Tailor your CV and cover letter using local LLM',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage
  python run_workflow.py --cv my_cv.pdf --job job_desc.txt
  
  # With company name and profile
  python run_workflow.py --cv my_cv.pdf --job acme_job.txt --company "Acme Corp" --profile profile.txt
  
  # With custom application questions
  python run_workflow.py --cv my_cv.pdf --job job.txt --questions questions.txt
  
  # Use different model
  python run_workflow.py --cv my_cv.pdf --job job.txt --model mistral:7b
  
  # Enable ATS optimization (default)
  python run_workflow.py --cv my_cv.pdf --job job.txt --ats
  
  # Disable ATS optimization
  python run_workflow.py --cv my_cv.pdf --job job.txt --no-ats
        """
    )
    
    parser.add_argument('--cv', required=True, 
                       help='Path to your CV (PDF, DOCX, or TXT)')
    parser.add_argument('--job', required=True,
                       help='Path to job description (TXT file)')
    parser.add_argument('--profile', 
                       help='Path to web profile content (optional)')
    parser.add_argument('--company',
                       help='Company name for cover letter')
    parser.add_argument('--questions',
                       help='Path to file with application questions')
    parser.add_argument('--model', default='llama3.1:8b',
                       help='Ollama model to use (default: llama3.1:8b)')
    
    args = parser.parse_args()
    
    # Validate files exist
    cv_path = Path(args.cv)
    job_path = Path(args.job)
    
    if not cv_path.exists():
        print(f"❌ Error: CV file not found: {cv_path}")
        return
    
    if not job_path.exists():
        print(f"❌ Error: Job description file not found: {job_path}")
        return
    
    if args.profile and not Path(args.profile).exists():
        print(f"❌ Error: Profile file not found: {args.profile}")
        return
    
    # Read custom questions if provided
    custom_questions = None
    if args.questions:
        questions_path = Path(args.questions)
        if questions_path.exists():
            with open(questions_path, 'r') as f:
                custom_questions = f.read()
        else:
            print(f"⚠️  Warning: Questions file not found: {questions_path}")
    
    # Initialize workflow
    workflow = JobApplicationWorkflow(model_name=args.model)
    
    # Process application
    try:
        output_dir = workflow.process_job_application(
            cv_path=str(cv_path),
            job_desc_path=str(job_path),
            profile_path=args.profile,
            company_name=args.company,
            custom_questions=custom_questions
        )
        
        print(f"\n🎉 Success! Your tailored application materials are ready.")
        print(f"\n📂 Output directory: {output_dir}")
        
    except Exception as e:
        print(f"\n❌ Error occurred: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()