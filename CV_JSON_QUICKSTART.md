# CV JSON Workflow - Quick Start Guide

## 📁 What We Built Today

A system to maintain your professional profile in **one JSON file** and generate filtered outputs (CVs, LinkedIn, bios) from it.

---

## 🗂️ File Structure

```
job_applications/
├── venv/                              (Python environment)
├── inputs/
│   ├── my_profile.json                ← YOUR WORKING FILE (edit this!)
│   ├── my_profile_001v1_2025-10-14.json  ← Versioned backup
│   └── cv_schema.json                 ← Template (reference only)
├── cv_to_json.py                      (Convert text CV to JSON)
├── generate_output.py                 ← NEW! Generate filtered outputs
└── outputs/                           (Generated CVs, etc.)
```

---

## 🚀 Daily Workflow

### 1. Navigate and Activate

```powershell
cd "C:\Users\davidgp2022\My Drive\Kaizen\job_applications"
.\venv\Scripts\Activate.ps1
```

### 2. Edit Your Profile

```powershell
notepad inputs/my_profile.json
```

**Key fields to populate:**
- `"name"`: Your actual name
- `"title"`: Your job title (e.g., "Programme Manager")
- `"include_in": ["cv", "linkedin", "website"]` ← Add to EVERY item you want to appear
- `"priority": "high"` or `"medium"` or `"low"` ← Helps filter important content
- `"tags": ["ai", "leadership", "agile"]` ← For focus filtering

### 3. Test Your Changes

```powershell
# View profile stats
python generate_output.py --output stats

# Generate CV (display on screen)
python generate_output.py --output cv

# Generate CV with focus
python generate_output.py --output cv --focus technical

# Save CV to file
python generate_output.py --output cv --save outputs/my_cv.md

# Generate LinkedIn summary
python generate_output.py --output linkedin

# Generate brief bio
python generate_output.py --output bio
```

### 4. Save Versions

When you reach a good milestone:

```powershell
# Copy your working file to a versioned backup
copy inputs/my_profile.json inputs/my_profile_002v1_2025-10-15.json
```

**Naming convention:** `my_profile_[increment]v[version]_YYYY-MM-DD.json`
- Increment for major updates (new job, cert)
- Version for minor tweaks same day

---

## 📋 Critical Fields for Each Section

### Experience Entry
```json
{
  "title": "Programme Manager",
  "company": "Company Name",
  "start_date": "2021-07-01",
  "end_date": null,
  "is_current": true,
  "include_in": ["cv", "linkedin", "website"],  ← REQUIRED!
  "priority": "high",
  "relevance_tags": ["programme_management", "leadership"],
  "achievements": [
    {
      "text": "Led £2M programme...",
      "tags": ["leadership", "budget"],
      "highlight": true,
      "include_in": ["cv", "linkedin"]
    }
  ]
}
```

### Certification Entry
```json
{
  "name": "MSP Practitioner",
  "issuer": "AXELOS",
  "date_issued": "2020-06-15",
  "status": "active",
  "include_in": ["cv", "linkedin"],  ← REQUIRED!
  "priority": "high"
}
```

---

## 🎯 Common Commands

### Quick CV Generation
```powershell
# Standard CV
python generate_output.py --output cv --save outputs/standard_cv.md

# Technical-focused CV
python generate_output.py --output cv --focus technical --save outputs/technical_cv.md

# Leadership-focused CV (max 5 jobs)
python generate_output.py --output cv --focus leadership --max-experiences 5 --save outputs/leadership_cv.md
```

### LinkedIn Update
```powershell
python generate_output.py --output linkedin --save outputs/linkedin_summary.txt
```

### Profile Check
```powershell
# See what's in your profile
python generate_output.py --output stats
```

---

## 🔧 Troubleshooting

### Script not found
```powershell
# Make sure you're in the right folder
cd "C:\Users\davidgp2022\My Drive\Kaizen\job_applications"
ls *.py  # Should see generate_output.py
```

### Nothing showing in CV
**Problem:** Items missing `"include_in"` field

**Fix:** Add `"include_in": ["cv", "linkedin"]` to experiences, education, certifications

### Venv activation fails
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 💡 Pro Tips

1. **Edit incrementally:** Add one section at a time, test with `--output cv`

2. **Use tags consistently:** Define them once in `metadata.tags_dictionary`

3. **Prioritise properly:**
   - `"high"`: Must appear in CVs
   - `"medium"`: Good to have
   - `"low"`: Filler/optional

4. **Highlight star achievements:** Set `"highlight": true` on your best accomplishments

5. **Version regularly:** Every time you add significant content (new job, cert, project)

6. **Test different focuses:** Try `--focus technical`, `--focus leadership`, `--focus programme_management`

---

## 📊 What Each Output Does

| Command | Purpose | Best For |
|---------|---------|----------|
| `--output cv` | Full CV in Markdown | Job applications, formal CVs |
| `--output linkedin` | LinkedIn summary text | Updating your LinkedIn profile |
| `--output bio` | Brief 100-word bio | Email signatures, conference bios |
| `--output stats` | Profile statistics | Checking what content you have |

---

## 🎨 Customisation Options

### Focus Areas (use with `--focus`)
- `technical` - Tech skills, dev projects
- `leadership` - Team management, people skills  
- `programme_management` - PMO, governance
- Any tag you've used in your profile!

### Filtering
- `--max-experiences 5` - Limit number of jobs shown
- Items automatically filtered by `include_in` field
- High priority items appear first

---

## 🔄 Integration with Existing Workflow

Your job application workflow remains unchanged:

```powershell
# Still works as before with text CV
python run_workflow.py --cv inputs/my_cv.txt --job inputs/job_descriptions/role.txt --model qwen2.5:32b
```

**Future enhancement:** Modify `run_workflow.py` to optionally read from JSON:
```powershell
python run_workflow.py --profile inputs/my_profile.json --job inputs/job_descriptions/role.txt
```

---

## ✅ Quick Test After Returning

```powershell
# 1. Activate venv
.\venv\Scripts\Activate.ps1

# 2. Check what you have
python generate_output.py --output stats

# 3. Generate a CV
python generate_output.py --output cv

# 4. If it looks wrong, check include_in fields
notepad inputs/my_profile.json
```

---

## 📝 Remember

- **Single source of truth:** `inputs/my_profile.json`
- **Edit once, generate many:** CV, LinkedIn, website, bios
- **Version everything:** Keep snapshots of your progress
- **include_in is key:** Without it, items won't appear in outputs
- **Test often:** Generate output after each major edit

---

## 🚀 Next Steps (Future)

When ready, we can:
1. Create format converters (Markdown → PDF, DOCX)
2. Integrate with your ATS workflow
3. Add more output formats (website HTML, conference bio, etc.)
4. Build automated tagging suggestions
5. Create a simple web UI for editing

---

**That's it! You now have a complete CV management system running 100% locally. Focus on your content - the system will handle the rest.** 🎉