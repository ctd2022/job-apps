# ATS Optimization Guide

## What is ATS?

**Applicant Tracking Systems (ATS)** are software applications that companies use to manage recruitment. They scan and filter CVs before a human ever sees them.

### Key Stats:
- **75%** of CVs are rejected by ATS before reaching a recruiter
- **98%** of Fortune 500 companies use ATS
- **60-70%** of UK companies use some form of ATS

## How Our ATS Optimization Works

### 1. **Keyword Analysis**
- Extracts critical keywords from the job description
- Identifies hard skills, soft skills, and qualifications
- Compares your CV against required terms

### 2. **Match Scoring**
- Calculates a 0-100% match score
- Shows which keywords are missing
- Highlights areas for improvement

### 3. **Optimized CV Generation**
- Creates ATS-friendly formatting
- Naturally incorporates key terms
- Maintains human readability

## ATS-Friendly Formatting Rules

### ✅ DO:
- **Simple headers**: PROFESSIONAL SUMMARY, WORK EXPERIENCE, SKILLS, EDUCATION
- **Standard bullet points**: • or - (hyphens)
- **Plain text**: No fancy formatting
- **Standard dates**: January 2023 - Present
- **Clear section breaks**: Use standard markdown headers
- **Skills section**: List skills prominently
- **Keywords**: Use exact terminology from job description
- **Quantify achievements**: Include numbers and metrics

### ❌ DON'T:
- Tables or columns
- Text boxes
- Headers/footers
- Images or graphics
- Special characters (★, ✓, etc.)
- Fancy fonts or colors
- Abbreviations without explanation
- Creative section names ("My Journey" instead of "WORK EXPERIENCE")

## Using ATS Optimization

### Basic Command (ATS enabled by default):
```bash
python run_workflow.py --cv inputs\my_cv.txt --job inputs\job_descriptions\job.txt --model qwen2.5:32b
```

### Disable ATS optimization:
```bash
python run_workflow.py --cv inputs\my_cv.txt --job inputs\job_descriptions\job.txt --no-ats
```

## Understanding Your ATS Report

### Score Ranges:
- **80-100%**: Excellent! Strong keyword match
- **60-79%**: Good, but could improve
- **Below 60%**: Needs significant keyword optimization

### What's in the Report:
1. **ATS Match Score**: Overall percentage
2. **Key Requirements**: Skills and qualifications identified
3. **Top Keywords**: Most important terms from job description
4. **Missing Keywords**: Terms you should consider adding
5. **Recommendations**: Specific improvement suggestions

## Example ATS Report Output

```
========================================
ATS OPTIMIZATION REPORT
========================================

ATS MATCH SCORE: 78.5%
Matched Keywords: 22 / 28

KEY REQUIREMENTS IDENTIFIED:
HARD SKILLS: Python, AWS, Docker, Kubernetes, CI/CD
SOFT SKILLS: Leadership, Communication, Agile
QUALIFICATIONS: Bachelor's degree, 5+ years experience

TOP KEYWORDS FROM JOB DESCRIPTION:
python, kubernetes, aws, docker, agile, ci/cd, microservices

MISSING KEYWORDS (Consider adding):
terraform, jenkins, grafana, prometheus

RECOMMENDATIONS:
⚠️ Good coverage, but consider adding more of the missing keywords.
========================================
```

## Common ATS Keywords by Role Type

### Software Engineer:
- Programming languages (Python, Java, JavaScript)
- Frameworks (React, Django, Spring)
- Tools (Git, Docker, Jenkins)
- Methodologies (Agile, Scrum, CI/CD)

### Programme Manager:
- Project management (Agile, Waterfall, PRINCE2)
- Tools (Jira, MS Project, Confluence)
- Skills (Stakeholder management, risk management)
- Certifications (PMP, PRINCE2, Agile)

### Data Analyst:
- Tools (SQL, Python, Tableau, Power BI)
- Skills (Data visualization, statistical analysis)
- Technologies (ETL, data warehousing)
- Methods (A/B testing, predictive modeling)

## Tips for Maximum ATS Success

### 1. **Mirror the Language**
Use the exact terminology from the job description. If they say "programme management," don't write "project management."

### 2. **Front-Load Keywords**
Put your most relevant skills and experience in the first third of your CV.

### 3. **Skills Section is Critical**
Create a dedicated SKILLS or CORE COMPETENCIES section with keywords.

### 4. **Use Standard Job Titles**
If your title was "Happiness Engineer," also mention "Customer Support Specialist."

### 5. **Spell Out Acronyms**
Write "Applicant Tracking System (ATS)" the first time, then use "ATS."

### 6. **Include Metrics**
"Increased efficiency by 30%" beats "Improved efficiency."

### 7. **List Certifications Clearly**
Use standard certification names: "Project Management Professional (PMP)"

## File Format Recommendations

### Best formats for ATS:
1. **.docx** (Microsoft Word) - Most compatible
2. **.pdf** - Good, but some older ATS struggle
3. **.txt** - Works but loses formatting

### Our tool generates:
- **Markdown (.md)** - Easy to convert to .docx or .pdf
- You can paste into Word/Google Docs for final formatting

## Converting Your Output

### To Word/PDF:
1. Open `tailored_cv.md` in a markdown editor
2. Export to .docx or .pdf
3. OR paste into Microsoft Word and format

### To Plain Text:
```bash
# Already plain text compatible!
# Just copy from tailored_cv.md
```

## ATS Optimization Workflow

```
1. Add job description → inputs/job_descriptions/
2. Run with ATS mode (default)
3. Review ATS analysis report
4. Check ATS match score
5. If score < 70%, review missing keywords
6. CV is already optimized with keywords
7. Convert to .docx format
8. Submit application
```

## Testing Your CV Against ATS

### Free ATS Testing Tools:
- **Jobscan** (jobscan.co) - Compare CV to job description
- **Resume Worded** (resumeworded.com) - ATS compatibility check
- **TopResume** (topresume.com/free-resume-review) - Free ATS scan

### Use our tool FIRST, then validate with these services!

## Frequently Asked Questions

### Q: Will this make my CV sound robotic?
**A:** No! Our LLM integrates keywords naturally while maintaining readability and personality.

### Q: Should I use ATS mode for every application?
**A:** Yes, especially for large companies. Disable only for small companies or direct contacts.

### Q: What if my ATS score is low?
**A:** Review the missing keywords and consider if you genuinely have those skills. Don't lie, but do highlight relevant experience.

### Q: Can I customize the ATS optimization?
**A:** Yes! Edit `ats_optimizer.py` to adjust keyword extraction or scoring logic.

## Next Steps

1. ✅ Always run ATS mode (it's default)
2. ✅ Review your ATS report for each application
3. ✅ Aim for 75%+ match score
4. ✅ Convert final CV to .docx format
5. ✅ Test with online ATS checkers
6. ✅ Submit with confidence!

---

**Remember**: ATS optimization gets you past the robots. The quality of your experience and achievements gets you the interview!