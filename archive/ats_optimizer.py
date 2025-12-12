#!/usr/bin/env python3
"""
ATS Optimization Module
Analyzes job descriptions and optimizes CVs for Applicant Tracking Systems
"""

import re
from collections import Counter
import ollama

class ATSOptimizer:
    def __init__(self, model_name="qwen2.5:32b"):
        self.model = model_name
        
        # Common ATS stopwords to exclude
        self.stopwords = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
            'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this',
            'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
        }
    
    def extract_keywords(self, text):
        """Extract important keywords from job description"""
        # Convert to lowercase and split into words
        words = re.findall(r'\b[a-z]{3,}\b', text.lower())
        
        # Remove stopwords
        keywords = [w for w in words if w not in self.stopwords]
        
        # Count frequency
        keyword_freq = Counter(keywords)
        
        return keyword_freq
    
    def identify_key_requirements(self, job_description):
        """Use LLM to identify critical requirements and keywords"""
        
        system_message = """You are an expert at analyzing job descriptions and identifying what ATS (Applicant Tracking Systems) look for. Extract the most important keywords and requirements."""
        
        prompt = f"""Analyze this job description and identify:

Job Description:
{job_description}

Provide:
1. HARD SKILLS (technical skills, tools, certifications) - list as comma-separated keywords
2. SOFT SKILLS (leadership, communication, etc.) - list as comma-separated keywords
3. REQUIRED QUALIFICATIONS (education, years of experience, must-haves)
4. CRITICAL KEYWORDS that an ATS would scan for

Format your response exactly like this:
HARD SKILLS: keyword1, keyword2, keyword3
SOFT SKILLS: keyword1, keyword2, keyword3
QUALIFICATIONS: requirement1, requirement2
CRITICAL KEYWORDS: keyword1, keyword2, keyword3

Be specific and use the exact terminology from the job description."""

        response = ollama.chat(
            model=self.model,
            messages=[
                {'role': 'system', 'content': system_message},
                {'role': 'user', 'content': prompt}
            ],
            options={
                'num_predict': 1024,
                'temperature': 0.3  # Lower temperature for more focused output
            }
        )
        
        return response['message']['content']
    
    def calculate_ats_score(self, cv_text, job_description, key_requirements):
        """Calculate how well the CV matches the job description"""
        
        # Extract keywords from both
        job_keywords = self.extract_keywords(job_description)
        cv_keywords = self.extract_keywords(cv_text)
        
        # Get top keywords from job description
        top_job_keywords = dict(job_keywords.most_common(30))
        
        # Check how many appear in CV
        matched = 0
        total = len(top_job_keywords)
        missing_keywords = []
        
        for keyword in top_job_keywords:
            if keyword in cv_keywords:
                matched += 1
            else:
                missing_keywords.append(keyword)
        
        score = (matched / total * 100) if total > 0 else 0
        
        return {
            'score': round(score, 1),
            'matched': matched,
            'total': total,
            'missing_keywords': missing_keywords[:10],  # Top 10 missing
            'top_job_keywords': list(top_job_keywords.keys())[:15]
        }
    
    def generate_ats_optimized_cv(self, base_cv, job_description, key_requirements):
        """Generate CV specifically optimized for ATS scanning"""
        
        system_message = """You are an expert CV writer specializing in ATS (Applicant Tracking System) optimization. 

CRITICAL ATS FORMATTING RULES:
- Use simple, standard section headers: PROFESSIONAL SUMMARY, WORK EXPERIENCE, SKILLS, EDUCATION
- Use standard bullet points (•) or hyphens (-), no fancy symbols
- Include keywords naturally throughout the CV
- Use standard date formats (Month Year - Month Year)
- No tables, text boxes, headers, footers, or columns
- No special characters or symbols
- Write in plain text markdown
- Skills should be listed clearly and match job description terminology exactly
- Use standard job titles and company names
- Include specific metrics and achievements with numbers

The CV must pass ATS scanning while remaining human-readable."""

        prompt = f"""Create an ATS-optimized CV based on:

BASE CV:
{base_cv}

JOB DESCRIPTION:
{job_description}

KEY REQUIREMENTS IDENTIFIED:
{key_requirements}

Create a complete, ATS-optimized CV that:
1. Uses simple formatting (plain markdown, standard headers)
2. Incorporates ALL critical keywords naturally
3. Matches the job requirements terminology exactly
4. Includes quantifiable achievements
5. Uses standard section headers
6. Lists skills clearly and prominently
7. Is optimized for both ATS scanning AND human readers

IMPORTANT: Output the COMPLETE CV. Use this structure:

# [Full Name]
[Contact Information]

## PROFESSIONAL SUMMARY
[2-3 sentences highlighting relevant experience and key skills]

## CORE SKILLS
[List relevant skills using exact terminology from job description]

## WORK EXPERIENCE
[List all relevant positions with achievements]

## EDUCATION
[Degrees and certifications]

## ADDITIONAL SKILLS / CERTIFICATIONS
[Any other relevant information]

Generate the complete CV now:"""

        response = ollama.chat(
            model=self.model,
            messages=[
                {'role': 'system', 'content': system_message},
                {'role': 'user', 'content': prompt}
            ],
            options={
                'num_predict': 8192,
                'temperature': 0.7
            }
        )
        
        return response['message']['content']
    
    def generate_ats_report(self, cv_text, job_description):
        """Generate a comprehensive ATS analysis report"""
        
        print("\n🔍 Analyzing job description for ATS requirements...")
        key_requirements = self.identify_key_requirements(job_description)
        
        print("\n📊 Calculating ATS match score...")
        ats_score = self.calculate_ats_score(cv_text, job_description, key_requirements)
        
        # Format report
        report = f"""
========================================
ATS OPTIMIZATION REPORT
========================================

ATS MATCH SCORE: {ats_score['score']}%
Matched Keywords: {ats_score['matched']} / {ats_score['total']}

KEY REQUIREMENTS IDENTIFIED:
{key_requirements}

TOP KEYWORDS FROM JOB DESCRIPTION:
{', '.join(ats_score['top_job_keywords'])}

MISSING KEYWORDS (Consider adding):
{', '.join(ats_score['missing_keywords'])}

RECOMMENDATIONS:
"""
        
        if ats_score['score'] >= 80:
            report += "✅ Excellent! Your CV has strong keyword coverage.\n"
        elif ats_score['score'] >= 60:
            report += "⚠️  Good coverage, but consider adding more of the missing keywords.\n"
        else:
            report += "❌ Low match score. Strongly recommend incorporating more keywords from the job description.\n"
        
        report += """
ATS-FRIENDLY FORMATTING CHECKLIST:
☐ Simple section headers (EXPERIENCE, SKILLS, EDUCATION)
☐ No tables or complex layouts
☐ Standard bullet points
☐ Plain text compatible
☐ Key skills listed prominently
☐ Dates in standard format (Month Year)
☐ No headers/footers/text boxes
☐ Includes relevant keywords naturally

========================================
"""
        
        return report, key_requirements, ats_score


def main():
    """Example usage"""
    print("""
╔════════════════════════════════════════════════════════╗
║          ATS Optimization Module                       ║
║  Optimize your CV for Applicant Tracking Systems      ║
╚════════════════════════════════════════════════════════╝

This module will be integrated into the main workflow.
    """)


if __name__ == "__main__":
    main()