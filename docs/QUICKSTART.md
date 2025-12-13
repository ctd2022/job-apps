# QuickStart Guide - Job Application Workflow

**Last Updated**: 13 December 2024  
**Status**: ✅ Production Ready with DOCX Generation

---

## 🚀 Daily Usage (Most Common)

### **Process a Single Job Application**

```powershell
# Navigate to project
cd "C:\Users\davidgp2022\My Drive\Kaizen\job_applications"

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run workflow
python scripts\run_workflow.py `
  --cv inputs\davidcv.txt `
  --job inputs\job_descriptions\[job-file].txt `
  --company "[Company Name]" `
  --backend ollama `
  --ollama-model llama3.2:3b
```

**Replace**:
- `[job-file].txt` - Your job description filename
- `[Company Name]` - Actual company name (for ATS filtering)

**Processing Time**: ~7-8 minutes with llama3.2:3b (fast), ~10-12 min with qwen2.5:32b (best quality)

---

## 📁 What You Get (6 Files Per Job)

```
outputs/job-name_OLLAMA_[timestamp]/
├── tailored_cv_ollama.md           # Markdown CV (for editing)
├── tailored_cv_ollama.docx         # ⭐ DOCX CV (for submission)
├── cover_letter_ollama.txt         # Text cover letter (for editing)
├── cover_letter_ollama.docx        # ⭐ DOCX cover letter (for submission)
├── ats_analysis_ollama.txt         # ATS report (for you to read)
└── metadata.json                   # Processing details
```

**Use the DOCX files for submission** - they're ATS-optimized and ready to go!

---

## 🎯 Common Commands

### **Standard Application (Recommended)**
```powershell
python scripts\run_workflow.py `
  --cv inputs\davidcv.txt `
  --job inputs\job_descriptions\tech-role.txt `
  --company "TechCorp" `
  --backend ollama `
  --ollama-model llama3.2:3b
```

### **High Quality (Slower but Better)**
```powershell
python scripts\run_workflow.py `
  --cv inputs\davidcv.txt `
  --job inputs\job_descriptions\senior-role.txt `
  --company "BigCompany" `
  --backend ollama `
  --ollama-model qwen2.5:32b
```

### **With Application Questions**
```powershell
python scripts\run_workflow.py `
  --cv inputs\davidcv.txt `
  --job inputs\job_descriptions\role.txt `
  --company "Company" `
  --questions inputs\questions.txt `
  --backend ollama
```

### **Disable ATS (for small companies/referrals)**
```powershell
python scripts\run_workflow.py `
  --cv inputs\davidcv.txt `
  --job inputs\job_descriptions\startup.txt `
  --no-ats `
  --backend ollama
```

---

## 📊 Understanding ATS Scores

**Your ATS report shows:**
- **80-100%**: ✅ Excellent! Strong keyword match
- **60-79%**: ⚠️  Good, consider adding missing keywords
- **Below 60%**: ❌ Needs work - review missing keywords

**The report includes:**
- Overall match percentage
- Key requirements (hard skills, soft skills, qualifications)
- Top matched keywords (what you have)
- Missing keywords (what to add)
- Recommendations

---

## 🔧 Available Models

| Model | Speed | Quality | VRAM | Use For |
|-------|-------|---------|------|---------|
| llama3.2:3b | ⚡ Fast (2-3 min) | Good | 2GB | Testing, quick drafts |
| llama3.1:8b | ⚡ Fast (4-5 min) | Good | 5GB | Daily use |
| qwen2.5:32b | 🐢 Slow (7-8 min) | ⭐ Best | 16GB | Final submissions |

**Recommendation**: Use `llama3.2:3b` for testing, `qwen2.5:32b` for actual submissions.

---

## 📂 File Organization

### **Add New Job Description**
```powershell
# Create new file
notepad inputs\job_descriptions\company-role.txt

# Paste job posting, save
```

### **Check Recent Outputs**
```powershell
# List recent jobs
ls outputs\ | sort LastWriteTime -Descending | select -First 5

# Open latest output
cd outputs\[folder-name]
```

### **Open Generated Files**
```powershell
# Open DOCX files (ready to submit)
start tailored_cv_ollama.docx
start cover_letter_ollama.docx

# Read ATS report
notepad ats_analysis_ollama.txt
```

---

## ⚙️ Backend Options

### **Ollama (Local - Default)**
```powershell
--backend ollama --ollama-model llama3.2:3b
```
- ✅ 100% private
- ✅ No API costs
- ✅ Fast with small models
- ❌ Requires local GPU

### **Llama.cpp (Local - Custom Models)**
```powershell
# Terminal 1: Start server
llama-server.exe -m path\to\model.gguf -ngl 50 -c 8192

# Terminal 2: Run workflow
--backend llamacpp
```
- ✅ Use any GGUF model
- ✅ Fine-tuned control
- ❌ Requires manual server start

### **Gemini (Cloud - Fast)**
```powershell
# Set API key
$env:GEMINI_API_KEY = "your-key"

--backend gemini
```
- ✅ Very fast (2-3 min)
- ✅ No local GPU needed
- ❌ Requires API key
- ❌ Rate limited (free tier)

---

## 🐛 Troubleshooting

### **Virtual Environment Won't Activate**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### **Ollama Connection Error**
```powershell
# Check Ollama is running
ollama list

# Start Ollama if needed
ollama serve
```

### **DOCX Files Not Generated**
```powershell
# Check Node.js is installed
node --version

# Check docx package is installed
npm list docx

# Install if missing
npm install docx
```

### **Module Import Errors**
```powershell
# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

### **Path Issues**
- Make sure you're in the project root: `C:\Users\davidgp2022\My Drive\Kaizen\job_applications`
- Virtual environment should show `(venv)` in prompt

---

## 📝 Tips for Best Results

### **1. Always Specify Company Name**
```powershell
--company "Actual Company Name"
```
This improves both ATS accuracy and cover letter personalization.

### **2. Review ATS Report First**
Check your score before submitting. If < 70%, review missing keywords.

### **3. Use DOCX Files for Submission**
The `.docx` files are ATS-optimized and professionally formatted. Use these, not the markdown versions.

### **4. Keep Job Descriptions Organized**
Name files clearly: `company-role-location.txt`
Example: `google-deepmind-london.txt`

### **5. Version Your CV**
Keep dated backups: `davidcv-2024-12.txt`, `davidcv-2024-11.txt`

---

## 🔄 Workflow Summary

```
1. Add job description → inputs/job_descriptions/
2. Run workflow with company name
3. Wait ~7-8 minutes
4. Check ATS score in report
5. Open DOCX files to review
6. Submit if score > 70%
7. If score low, review missing keywords and iterate
```

---

## 📚 Documentation Files

- **PROJECT_DIARY_004.md** - Latest progress and changes
- **ATS_OPTIMIZATION_GUIDE.md** - Deep dive on ATS
- **BACKEND_NAMING_GUIDE.md** - Output naming conventions
- **CV_JSON_QUICKSTART.md** - JSON CV management
- **HowToRun.html** - Comprehensive HTML guide

---

## 🆘 Quick Help

**Problem**: "I'm not getting DOCX files"
**Solution**: Check you have Node.js and run `npm install docx`

**Problem**: "ATS score is too low"
**Solution**: Review missing keywords in report and add them naturally to your CV

**Problem**: "Cover letter has weird text at the end"
**Solution**: Make sure you're using the updated workflow (check PROJECT_DIARY_004)

**Problem**: "Processing is too slow"
**Solution**: Use `--ollama-model llama3.2:3b` instead of qwen2.5:32b

---

## ✅ Pre-Flight Checklist

Before running workflow, verify:
- [ ] Virtual environment activated (`(venv)` in prompt)
- [ ] In correct directory (job_applications folder)
- [ ] Job description file exists in inputs/job_descriptions/
- [ ] Company name is correct
- [ ] Ollama is running (if using ollama backend)

---

## 🎯 Success Criteria

**Good Application Ready When**:
- ✅ ATS score > 70%
- ✅ DOCX files open correctly in Word
- ✅ Cover letter has no meta-commentary
- ✅ All key skills mentioned in job description are in CV
- ✅ Professional formatting looks clean

---

**Last Run**: 13 December 2024  
**Last Output**: `outputs\google-deepmind_OLLAMA_20251213_202451`  
**ATS Score**: 56.7% (Google DeepMind role - AI/prototyping vs banking CV mismatch expected)

---

## 🚀 Ready to Go!

You're all set. Just run the command and wait for your professional, ATS-optimized application materials! 🎉
