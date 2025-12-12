#!/usr/bin/env python3
"""
Local Job Application Workflow
Supports multiple LLM backends: Ollama, Llama.cpp, Gemini
Now with ATS Optimization!
"""

import os
import json
from pathlib import Path
from datetime import datetime
import PyPDF2
from docx import Document
from llm_backend import LLMBackendFactory, LLMBackend
from ats_optimizer import ATSOptimizer


class JobApplicationWorkflow:
    def __init__(self, backend_type: str = "ollama", backend_config: dict = None, enable_ats: bool = True):
        """
        Initialize with your preferred LLM backend
        
        Args:
            backend_type: 'ollama', 'llamacpp', or 'gemini'
            backend_config: Backend-specific configuration dict
                - Ollama: {'model_name': 'llama3.1:8b'}
                - Llama.cpp: {'base_url': 'http://localhost:8080', 'model_name': 'gemma-3-27B'}
                - Gemini: {'api_key': 'YOUR_KEY', 'model_name': 'gemini-1.5-pro', 'requests_per_minute': 10}
            enable_ats: Enable ATS optimization
        """
        self.backend_type = backend_type
        self.backend_config = backend_config or {}
        
        # Set default configs if not provided
        if backend_type == "ollama" and 'model_name' not in self.backend_config:
            self.backend_config['model_name'] = 'llama3.1:8b'
        elif backend_type == "llamacpp" and 'model_name' not in self.backend_config:
            self.backend_config['model_name'] = 'gemma-3-27B'
        elif backend_type == "gemini" and 'model_name' not in self.backend_config:
            self.backend_config['model_name'] = 'gemini-1.5-pro'
        
        # Create backend
        self.backend = LLMBackendFactory.create_backend(backend_type, **self.backend_config)
        
        self.base_dir = Path(".")
        self.enable_ats = enable_ats
        self.company_name = None  # Will be set during processing
        
        if enable_ats:
            # Note: company_name will be passed later during processing
            self.ats_optimizer = None
        
        self.setup_directories()
        
        print(f"🤖 Using backend: {self.backend.get_backend_name()}")
    
    def setup_directories(self):
        """Create necessary folder structure"""
        (self.base_dir / "inputs" / "job_descriptions").mkdir(parents=True, exist_ok=True)
        (self.base_dir / "outputs").mkdir(parents=True, exist_ok=True)
    
    def read_cv(self, cv_path):
        """Read CV from PDF, DOCX, or TXT"""
        cv_path = Path(cv_path)
        
        if cv_path.suffix.lower() == '.pdf':
            with open(cv_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text()
                return text
        
        elif cv_path.suffix.lower() == '.docx':
            doc = Document(cv_path)
            return "\n".join([para.text for para in doc.paragraphs])
        
        else:  # Assume text file
            with open(cv_path, 'r', encoding='utf-8') as file:
                return file.read()
    
    def read_text_file(self, file_path):
        """Read any text file"""
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    
    def call_llm(self, prompt, system_message=None, **kwargs):
        """Call LLM backend with streaming disabled for cleaner output"""
        messages = []
        
        if system_message:
            messages.append({
                'role': 'system',
                'content': system_message
            })
        
        messages.append({
            'role': 'user',
            'content': prompt
        })
        
        print(f"🤖 Processing with {self.backend.get_backend_name()}...")
        
        # Set defaults
        max_tokens = kwargs.get('max_tokens', 16384)
        temperature = kwargs.get('temperature', 0.7)
        top_p = kwargs.get('top_p', 0.9)
        
        return self.backend.chat(
            messages,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p
        )
    
    def tailor_cv(self, base_cv, job_description, profile_content=None):
        """Generate a tailored CV for the specific job"""
        
        system_message = """You are an expert CV/resume writer. Your task is to tailor CVs to specific job descriptions while maintaining truthfulness. 
        
Guidelines:
- Emphasize relevant experience and skills
- Use keywords from the job description naturally
- Reorder or highlight relevant achievements
- Keep the same factual content (don't fabricate)
- Maintain professional formatting
- Output in clean markdown format"""

        prompt = f"""Base CV:
{base_cv}

Job Description:
{job_description}
"""

        if profile_content:
            prompt += f"\nAdditional Profile Information:\n{profile_content}\n"
        
        prompt += """\nCreate a tailored CV that:
1. Highlights the most relevant experience for this role
2. Uses terminology from the job description
3. Emphasizes matching skills and achievements
4. Maintains all factual information from the original CV

IMPORTANT: Output the COMPLETE tailored CV in markdown format. Include ALL sections: header, summary, work experience, skills, education, and any other relevant sections. Do not truncate or summarize - provide the full detailed CV."""

        return self.call_llm(prompt, system_message)
    
    def generate_cover_letter(self, base_cv, job_description, company_name="the company"):
        """Generate a tailored cover letter"""
        
        system_message = """You are an expert at writing compelling, personalized cover letters that are professional yet engaging."""
        
        prompt = f"""Based on this CV:
{base_cv}

And this job description:
{job_description}

Write a professional cover letter for {company_name}. The letter should:
1. Be complete and well-structured (3-4 paragraphs minimum)
2. Highlight 2-3 most relevant achievements
3. Show genuine interest in the role
4. Explain why the candidate is a great fit
5. Be engaging and personal, not generic

IMPORTANT: Write the COMPLETE cover letter from opening to closing signature. Do not truncate or stop mid-sentence. Include all paragraphs."""

        return self.call_llm(prompt, system_message)
    
    def answer_application_questions(self, cv, job_description, questions):
        """Answer common application questions"""
        
        system_message = """You are helping write authentic, compelling answers to job application questions based on real experience."""
        
        prompt = f"""CV Summary:
{cv[:2000]}  # Truncate for context

Job Description:
{job_description}

Answer these application questions professionally and concisely:
{questions}

For each question, provide a clear, specific answer based on the CV experience."""

        return self.call_llm(prompt, system_message)
    
    def process_job_application(self, cv_path, job_desc_path, profile_path=None, 
                                company_name=None, custom_questions=None, ats_mode=True):
        """Complete workflow for one job application"""
        
        print("\n" + "="*60)
        print("🚀 Starting Job Application Workflow")
        print(f"🤖 Backend: {self.backend.get_backend_name()}")
        if ats_mode and self.enable_ats:
            print("🎯 ATS OPTIMIZATION MODE: ENABLED")
        print("="*60)
        
        # Read inputs
        print("\n📄 Reading input files...")
        base_cv = self.read_cv(cv_path)
        job_description = self.read_text_file(job_desc_path)
        profile_content = self.read_text_file(profile_path) if profile_path else None
        
        # Initialize ATS optimizer with company name if enabled
        if ats_mode and self.enable_ats:
            self.ats_optimizer = ATSOptimizer(
                backend=self.backend,
                company_name=company_name
            )
        
        # ATS Analysis (if enabled)
        ats_report = None
        key_requirements = None
        ats_score = None
        
        if ats_mode and self.enable_ats:
            print("\n🔍 Running ATS optimization analysis...")
            ats_report, key_requirements, ats_score = self.ats_optimizer.generate_ats_report(
                base_cv, job_description
            )
            print(ats_report)
            
            # Generate ATS-optimized CV
            print("\n✍️  Generating ATS-optimized CV...")
            tailored_cv = self.ats_optimizer.generate_ats_optimized_cv(
                base_cv, job_description, key_requirements
            )
        else:
            # Generate outputs (standard mode)
            print("\n✍️  Generating tailored CV...")
            tailored_cv = self.tailor_cv(base_cv, job_description, profile_content)
        
        print("\n✍️  Generating cover letter...")
        cover_letter = self.generate_cover_letter(base_cv, job_description, 
                                                  company_name or "the company")
        
        # Optional: Answer custom questions
        answers = None
        if custom_questions:
            print("\n✍️  Answering application questions...")
            answers = self.answer_application_questions(base_cv, job_description, 
                                                       custom_questions)
        
        # Save outputs with backend identifier
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        job_name = Path(job_desc_path).stem
        backend_label = self.backend_type.upper()  # OLLAMA, LLAMACPP, or GEMINI
        output_dir = self.base_dir / "outputs" / f"{job_name}_{backend_label}_{timestamp}"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"\n💾 Saving outputs to: {output_dir}")
        
        # Save tailored CV with backend label
        cv_filename = f"tailored_cv_{backend_label.lower()}.md"
        with open(output_dir / cv_filename, 'w', encoding='utf-8') as f:
            f.write(tailored_cv)
        
        # Save cover letter with backend label
        letter_filename = f"cover_letter_{backend_label.lower()}.txt"
        with open(output_dir / letter_filename, 'w', encoding='utf-8') as f:
            f.write(cover_letter)
        
        # Save ATS report if generated with backend label
        if ats_report:
            ats_filename = f"ats_analysis_{backend_label.lower()}.txt"
            with open(output_dir / ats_filename, 'w', encoding='utf-8') as f:
                f.write(ats_report)
        
        # Save answers if generated with backend label
        if answers:
            answers_filename = f"application_answers_{backend_label.lower()}.txt"
            with open(output_dir / answers_filename, 'w', encoding='utf-8') as f:
                f.write(answers)
        
        # Save metadata with detailed backend info
        metadata = {
            "job_description": job_desc_path,
            "company_name": company_name,
            "timestamp": timestamp,
            "backend": {
                "type": self.backend_type,
                "name": self.backend.get_backend_name(),
                "config": self.backend_config
            },
            "ats_optimized": ats_mode and self.enable_ats,
            "ats_score": ats_score['score'] if ats_score else None
        }
        with open(output_dir / "metadata.json", 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print("\n✅ Complete! Generated files:")
        print(f"   - {output_dir / cv_filename}")
        print(f"   - {output_dir / letter_filename}")
        if ats_report:
            print(f"   - {output_dir / ats_filename}")
            print(f"\n📊 ATS MATCH SCORE: {ats_score['score']}%")
        if answers:
            print(f"   - {output_dir / answers_filename}")
        
        return output_dir


def main():
    """Example usage"""
    
    print("""
╔════════════════════════════════════════════════════════════╗
║     Local Job Application Workflow - Multi-Backend         ║
╚════════════════════════════════════════════════════════════╝

Supports three LLM backends:
1. Ollama (local models)
2. Llama.cpp server (local GGUF models)
3. Gemini API (cloud, with rate limiting)

Please place your files in the following structure:

job_applications/
├── inputs/
│   ├── my_cv.pdf (or .docx, .txt)
│   ├── profile.txt (optional)
│   └── job_descriptions/
│       └── job_001.txt
└── outputs/

Use run_workflow.py to process applications.
""")


if __name__ == "__main__":
    main()
