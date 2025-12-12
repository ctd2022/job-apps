#!/usr/bin/env python3
"""
Simple CLI interface for the job application workflow
Now supports multiple LLM backends: Ollama, Llama.cpp, Gemini
"""

import sys
from pathlib import Path

# Add src directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import argparse
import os
from job_application_workflow import JobApplicationWorkflow


def main():
    parser = argparse.ArgumentParser(
        description='Local Job Application Workflow - Multi-Backend Support',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Backend Options:
  --backend ollama     Use Ollama (default)
  --backend llamacpp   Use Llama.cpp server
  --backend gemini     Use Google Gemini API

Examples:
  # Basic usage with Ollama
  python run_workflow_v2.py --cv my_cv.pdf --job job_desc.txt
  
  # Using Llama.cpp server
  python run_workflow_v2.py --cv my_cv.pdf --job job.txt --backend llamacpp --llamacpp-url http://localhost:8080
  
  # Using Gemini API
  python run_workflow_v2.py --cv my_cv.pdf --job job.txt --backend gemini --gemini-key YOUR_API_KEY
  
  # Using Gemini with environment variable
  set GEMINI_API_KEY=YOUR_KEY
  python run_workflow_v2.py --cv my_cv.pdf --job job.txt --backend gemini
  
  # With company name and profile (any backend)
  python run_workflow_v2.py --cv my_cv.pdf --job acme_job.txt --company "Acme Corp" --profile profile.txt
  
  # Disable ATS optimization
  python run_workflow_v2.py --cv my_cv.pdf --job job.txt --no-ats
        """
    )
    
    # Required arguments
    parser.add_argument('--cv', required=True, 
                       help='Path to your CV (PDF, DOCX, or TXT)')
    parser.add_argument('--job', required=True,
                       help='Path to job description (TXT file)')
    
    # Backend selection
    parser.add_argument('--backend', choices=['ollama', 'llamacpp', 'gemini'],
                       default='ollama',
                       help='LLM backend to use (default: ollama)')
    
    # Ollama options
    parser.add_argument('--ollama-model', default='llama3.1:8b',
                       help='Ollama model name (default: llama3.1:8b)')
    
    # Llama.cpp options
    parser.add_argument('--llamacpp-url', default='http://localhost:8080',
                       help='Llama.cpp server URL (default: http://localhost:8080)')
    parser.add_argument('--llamacpp-model', default='gemma-3-27B',
                       help='Model name for metadata (default: gemma-3-27B)')
    
    # Gemini options
    parser.add_argument('--gemini-key',
                       help='Gemini API key (or set GEMINI_API_KEY env var)')
    parser.add_argument('--gemini-model', default='gemini-1.5-pro',
                       help='Gemini model name (default: gemini-1.5-pro)')
    parser.add_argument('--gemini-rpm', type=int, default=10,
                       help='Gemini requests per minute limit (default: 10)')
    
    # Optional arguments
    parser.add_argument('--profile', 
                       help='Path to web profile content (optional)')
    parser.add_argument('--company',
                       help='Company name for cover letter')
    parser.add_argument('--questions',
                       help='Path to file with application questions')
    parser.add_argument('--no-ats', action='store_true',
                       help='Disable ATS optimization')
    
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
    
    # Build backend configuration
    backend_config = {}
    
    if args.backend == 'ollama':
        backend_config = {'model_name': args.ollama_model}
    
    elif args.backend == 'llamacpp':
        backend_config = {
            'base_url': args.llamacpp_url,
            'model_name': args.llamacpp_model
        }
    
    elif args.backend == 'gemini':
        api_key = args.gemini_key or os.environ.get('GEMINI_API_KEY')
        if not api_key:
            print("❌ Error: Gemini API key required. Use --gemini-key or set GEMINI_API_KEY environment variable.")
            return
        
        backend_config = {
            'api_key': api_key,
            'model_name': args.gemini_model,
            'requests_per_minute': args.gemini_rpm
        }
    
    # Initialize workflow
    try:
        workflow = JobApplicationWorkflow(
            backend_type=args.backend,
            backend_config=backend_config,
            enable_ats=not args.no_ats
        )
    except Exception as e:
        print(f"❌ Error initializing workflow: {str(e)}")
        return
    
    # Process application
    try:
        output_dir = workflow.process_job_application(
            cv_path=str(cv_path),
            job_desc_path=str(job_path),
            profile_path=args.profile,
            company_name=args.company,
            custom_questions=custom_questions,
            ats_mode=not args.no_ats
        )
        
        print(f"\n🎉 Success! Your tailored application materials are ready.")
        print(f"\n📂 Output directory: {output_dir}")
        
    except Exception as e:
        print(f"\n❌ Error occurred: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
