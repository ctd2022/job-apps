#!/usr/bin/env python3
"""
ATS Optimization Module
Analyzes job descriptions and optimizes CVs for Applicant Tracking Systems
Now supports multiple LLM backends
"""

import re
from collections import Counter
from llm_backend import LLMBackend


class ATSOptimizer:
    def __init__(self, backend: LLMBackend = None, model_name: str = None, company_name: str = None):
        """
        Initialize with an LLM backend
        
        Args:
            backend: LLMBackend instance (Ollama, Llama.cpp, or Gemini)
            model_name: Legacy parameter for backward compatibility (ignored if backend provided)
            company_name: Company name to exclude from keyword matching
        """
        self.backend = backend
        self.model_name = model_name  # Store for legacy compatibility
        self.company_name = company_name
        
        # Base ATS stopwords (articles, prepositions, common verbs)
        self.base_stopwords = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
            'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this',
            'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
            'us', 'them', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
            'all', 'each', 'every', 'both', 'few', 'more', 'most', 'some', 'such'
        }
        
        # Job posting UI/navigation words (common across job sites)
        self.ui_stopwords = {
            'apply', 'job', 'save', 'show', 'view', 'click', 'here', 'read',
            'more', 'less', 'back', 'next', 'previous', 'search', 'filter',
            'sort', 'share', 'print', 'email', 'download', 'upload', 'submit',
            'send', 'post', 'date', 'ago', 'day', 'week', 'month', 'year',
            'new', 'updated', 'end', 'start', 'while', 'during', 'about',
            'our', 'your', 'their', 'its', 'my'
        }
        
        # Initialize dynamic stopwords
        self.dynamic_stopwords = set()
        if company_name:
            self._add_company_variations(company_name)
    
    def _add_company_variations(self, company_name: str):
        """Add company name variations to stopwords"""
        # Add lowercase company name
        self.dynamic_stopwords.add(company_name.lower())
        
        # Add individual words if multi-word company name
        for word in company_name.lower().split():
            if len(word) > 2:  # Skip very short words
                self.dynamic_stopwords.add(word)
        
        # Add common company suffixes to exclude
        company_suffixes = {
            'ltd', 'limited', 'inc', 'incorporated', 'corp', 'corporation',
            'llc', 'plc', 'group', 'holdings', 'company', 'co'
        }
        self.dynamic_stopwords.update(company_suffixes)
    
    def _extract_company_from_text(self, job_description: str):
        """Extract likely company name from job description if not provided"""
        # Simple extraction - look for common patterns
        # This is a fallback if company name not provided via CLI
        
        # Pattern 1: "Company: XYZ" or "Organization: XYZ"
        import re
        patterns = [
            r'(?:company|organization|employer):\s*([A-Z][A-Za-z\s&]+?)(?:\n|\.|,)',
            r'(?:join|at)\s+([A-Z][A-Za-z\s&]+?)\s+(?:as|in|for)',
            r'^([A-Z][A-Za-z\s&]+?)\s+is\s+(?:seeking|looking|hiring)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, job_description, re.MULTILINE | re.IGNORECASE)
            if match:
                company = match.group(1).strip()
                # Validate it's not too long (probably not a company name)
                if len(company.split()) <= 4:
                    return company
        
        return None
    
    def get_all_stopwords(self):
        """Get combined set of all stopwords"""
        return self.base_stopwords | self.ui_stopwords | self.dynamic_stopwords
    
    def extract_keywords(self, text, auto_detect_company=True):
        """Extract important keywords from job description"""
        # Auto-detect company name if not provided and requested
        if auto_detect_company and not self.company_name:
            detected_company = self._extract_company_from_text(text)
            if detected_company:
                self._add_company_variations(detected_company)
        
        # Convert to lowercase and split into words
        words = re.findall(r'\b[a-z]{3,}\b', text.lower())
        
        # Get all stopwords (base + UI + dynamic)
        all_stopwords = self.get_all_stopwords()
        
        # Remove stopwords
        keywords = [w for w in words if w not in all_stopwords]
        
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

        messages = [
            {'role': 'system', 'content': system_message},
            {'role': 'user', 'content': prompt}
        ]
        
        return self.backend.chat(messages, temperature=0.3, max_tokens=1024)
    
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

        messages = [
            {'role': 'system', 'content': system_message},
            {'role': 'user', 'content': prompt}
        ]
        
        return self.backend.chat(messages, temperature=0.7, max_tokens=8192)
    
    def generate_ats_report(self, cv_text, job_description):
        """Generate a comprehensive ATS analysis report"""
        
        print("\n🔍 Analyzing job description for ATS requirements...")
        key_requirements = self.identify_key_requirements(job_description)
        
        print("\n📊 Calculating ATS match score...")
        ats_score = self.calculate_ats_score(cv_text, job_description, key_requirements)
        
        # Build matched/missing keyword breakdown
        all_keywords_breakdown = []
        for keyword in ats_score['top_job_keywords']:
            if keyword in ats_score['missing_keywords']:
                all_keywords_breakdown.append(f"❌ {keyword}")
            else:
                all_keywords_breakdown.append(f"✅ {keyword}")
        
        # Format report
        report = f"""
========================================
ATS OPTIMIZATION REPORT
========================================

ATS MATCH SCORE: {ats_score['score']}%
Matched Keywords: {ats_score['matched']} / {ats_score['total']}
"""
        
        # Add company exclusion note if applicable
        if self.company_name:
            report += f"\nCompany excluded from analysis: {self.company_name}\n"
        
        report += f"""
KEY REQUIREMENTS IDENTIFIED:
{key_requirements}

ALL TOP {ats_score['total']} KEYWORDS (✅ = in your CV, ❌ = missing):
{chr(10).join(all_keywords_breakdown)}

TOP MATCHED KEYWORDS:
{', '.join([k for k in ats_score['top_job_keywords'] if k not in ats_score['missing_keywords']][:10])}

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
╔═══════════════════════════════════════════════════════╗
║          ATS Optimization Module                      ║
║  Optimize your CV for Applicant Tracking Systems     ║
╚═══════════════════════════════════════════════════════╝

This module will be integrated into the main workflow.
    """)


if __name__ == "__main__":
    main()
    