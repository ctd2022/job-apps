# Backend-Labeled Output Naming

## 🎯 New Naming Convention

All outputs now include the backend identifier in both folder names and filenames!

---

## 📁 Folder Naming

### Format:
```
{job_name}_{BACKEND}_{timestamp}/
```

### Examples:

**Ollama:**
```
citi-role_OLLAMA_20251204_112851/
```

**Llama.cpp:**
```
citi-role_LLAMACPP_20251204_114523/
```

**Gemini:**
```
citi-role_GEMINI_20251204_115830/
```

---

## 📄 File Naming

### Format:
```
{file_type}_{backend}.{extension}
```

### Complete Example Structure:

```
citi-role_OLLAMA_20251204_112851/
├── tailored_cv_ollama.md
├── cover_letter_ollama.txt
├── ats_analysis_ollama.txt
├── application_answers_ollama.txt    (if questions provided)
└── metadata.json

citi-role_LLAMACPP_20251204_114523/
├── tailored_cv_llamacpp.md
├── cover_letter_llamacpp.txt
├── ats_analysis_llamacpp.txt
└── metadata.json

citi-role_GEMINI_20251204_115830/
├── tailored_cv_gemini.md
├── cover_letter_gemini.txt
├── ats_analysis_gemini.txt
└── metadata.json
```

---

## 🎯 Benefits

### 1. **Instant Backend Identification**
No need to open metadata.json - just look at the folder/file name!

### 2. **Easy Filtering**
```powershell
# List only Ollama outputs
ls outputs\*_OLLAMA_*

# List only Llama.cpp outputs
ls outputs\*_LLAMACPP_*

# List only Gemini outputs
ls outputs\*_GEMINI_*
```

### 3. **Clear Comparisons**
```powershell
# Compare same job across backends
ls outputs\citi-role_*

# Result:
citi-role_OLLAMA_20251204_104317
citi-role_LLAMACPP_20251204_112851
citi-role_GEMINI_20251204_120145
```

### 4. **No More Confusion**
Files themselves show which backend generated them:
```
tailored_cv_ollama.md      ← Clearly from Ollama
tailored_cv_llamacpp.md    ← Clearly from Llama.cpp
tailored_cv_gemini.md      ← Clearly from Gemini
```

---

## 📊 Enhanced Metadata

The `metadata.json` now includes detailed backend information:

```json
{
  "job_description": "inputs/job_descriptions/citi-role.txt",
  "company_name": "Citi",
  "timestamp": "20251204_112851",
  "backend": {
    "type": "ollama",
    "name": "Ollama (qwen2.5:32b)",
    "config": {
      "model_name": "qwen2.5:32b"
    }
  },
  "ats_optimized": true,
  "ats_score": 78.5
}
```

---

## 🔍 Quick Comparison Commands

### Compare ATS Scores Across Backends:

```powershell
# For a specific job
$job = "citi-role"

Write-Host "`n=== ATS SCORES COMPARISON ===" -ForegroundColor Cyan

# Ollama
if (Test-Path "outputs\${job}_OLLAMA_*\ats_analysis_ollama.txt") {
    Write-Host "`nOllama:" -ForegroundColor Yellow
    Select-String -Path "outputs\${job}_OLLAMA_*\ats_analysis_ollama.txt" -Pattern "ATS MATCH SCORE" | Select-Object -First 1
}

# Llama.cpp
if (Test-Path "outputs\${job}_LLAMACPP_*\ats_analysis_llamacpp.txt") {
    Write-Host "`nLlama.cpp:" -ForegroundColor Green
    Select-String -Path "outputs\${job}_LLAMACPP_*\ats_analysis_llamacpp.txt" -Pattern "ATS MATCH SCORE" | Select-Object -First 1
}

# Gemini
if (Test-Path "outputs\${job}_GEMINI_*\ats_analysis_gemini.txt") {
    Write-Host "`nGemini:" -ForegroundColor Blue
    Select-String -Path "outputs\${job}_GEMINI_*\ats_analysis_gemini.txt" -Pattern "ATS MATCH SCORE" | Select-Object -First 1
}
```

### Open All Versions for Comparison:

```powershell
# Open all CVs for same job
$job = "citi-role"
notepad outputs\${job}_OLLAMA_*\tailored_cv_ollama.md
notepad outputs\${job}_LLAMACPP_*\tailored_cv_llamacpp.md
notepad outputs\${job}_GEMINI_*\tailored_cv_gemini.md
```

---

## 📝 Usage Examples

### Process with Different Backends:

```powershell
# Ollama
python run_workflow_v2.py --cv inputs\my_cv.txt --job inputs\job_descriptions\citi-role.txt --backend ollama
# Creates: citi-role_OLLAMA_20251204_HHMMSS/

# Llama.cpp
python run_workflow_v2.py --cv inputs\my_cv.txt --job inputs\job_descriptions\citi-role.txt --backend llamacpp
# Creates: citi-role_LLAMACPP_20251204_HHMMSS/

# Gemini
python run_workflow_v2.py --cv inputs\my_cv.txt --job inputs\job_descriptions\citi-role.txt --backend gemini
# Creates: citi-role_GEMINI_20251204_HHMMSS/
```

---

## 🗂️ Organizing Your Outputs

### Create Backend-Specific Folders:

```powershell
# Organize by backend type
mkdir outputs\by_backend\ollama
mkdir outputs\by_backend\llamacpp
mkdir outputs\by_backend\gemini

# Move outputs (examples)
mv outputs\*_OLLAMA_* outputs\by_backend\ollama\
mv outputs\*_LLAMACPP_* outputs\by_backend\llamacpp\
mv outputs\*_GEMINI_* outputs\by_backend\gemini\
```

### Track Your Best Backend:

Create `backend_performance.md`:
```markdown
# Backend Performance Tracking

## ATS Scores by Backend

| Job | Ollama | Llama.cpp | Gemini | Winner |
|-----|--------|-----------|--------|--------|
| Citi Role | 53.3% | 72.1% | 68.5% | Llama.cpp |
| BT PM | 78.2% | 76.8% | 80.1% | Gemini |

## Quality Assessment

### Ollama (qwen2.5:32b)
- ⭐⭐⭐⭐⭐ Best for detailed, professional tone
- Speed: 7-8 minutes
- Best for: Complex roles requiring detailed experience

### Llama.cpp (gemma-3-27B)
- ⭐⭐⭐⭐⭐ Best for keyword optimization
- Speed: 6-7 minutes
- Best for: ATS-heavy applications

### Gemini
- ⭐⭐⭐⭐ Fast and efficient
- Speed: 2-3 minutes
- Best for: Quick turnaround, batch processing
```

---

## 🎯 Migration Note

### Old Files (Already Created):
```
citi-role_20251204_104317/          ← No backend label
├── tailored_cv.md                  ← No backend label
├── cover_letter.txt
└── ats_analysis.txt
```

### New Files (After Update):
```
citi-role_LLAMACPP_20251204_112851/ ← Backend labeled!
├── tailored_cv_llamacpp.md         ← Backend labeled!
├── cover_letter_llamacpp.txt
└── ats_analysis_llamacpp.txt
```

**Your existing files are fine!** The metadata.json shows which backend was used. New files will have the improved naming.

---

## ✅ Summary

**Now you get:**
✅ Backend type in folder name (OLLAMA, LLAMACPP, GEMINI)
✅ Backend type in each filename
✅ Enhanced metadata with full backend details
✅ Timestamp still preserved
✅ Easy filtering and comparison
✅ No confusion about which backend created what

**Perfect for:**
- 🔍 Quick backend identification
- 📊 Performance comparisons
- 🗂️ Organized file management
- 📈 Tracking which backend works best for different roles

---

**Update applied! Next run will use the new naming scheme!** 🎉
