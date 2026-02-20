# ATS Matching & Scoring Engine (JD ↔ CV) — **Hybrid + Semantic v2**
*A readable spec + capability checklist for your job-hunting app (modern ATS-style, but better).*

---

## 🔥 Core Principle (How matching works in 2026)
The system compares a **CV** to a **Job Description (JD)** and produces:

- **Match Score (0–100)**
- **Sub-scores** (skills, experience, titles, etc.)
- **Gap analysis + fix suggestions**
- **Explainability (why the score is what it is)**

### ✅ The Big Shift: Keyword → Embeddings → **Hybrid**
Modern matching is **not** “keywords OR embeddings”.  
It’s **hybrid scoring**:

- **Lexical Match** = keywords, frequency, must-haves, exact terms
- **Semantic Match** = embeddings similarity (meaning-based)
- **Constraints** = hard gates (years, certs, must-haves)

> **Final Score = Lexical + Semantic + Evidence + Constraints**

---

# 1) 📥 Input Handling & Normalization
### 1.1 Supported Inputs
- PDF
- DOCX
- TXT
- Copy/paste text

### 1.2 Text Cleaning / Standardization
- Normalize case, whitespace, punctuation
- Strip noise (headers, footers, page numbers)
- Normalize spelling variants (UK/US)
- Normalize common word forms:
  - “optimise” ↔ “optimize”
  - “ML” ↔ “Machine Learning”
  - “AWS” ↔ “Amazon Web Services”

### 1.3 Section Detection (Structure Awareness)
Detect and label sections to improve scoring accuracy:

- Summary / Profile
- Skills
- Experience
- Education
- Certifications
- Projects
- Tools / Tech
- Other / Misc

**Why it matters:**  
A skill in **Experience** is stronger evidence than a skill in **Skills**.

---

# 2) 🧠 Extraction Engine (Structured Intelligence)
Turn raw text into structured data objects (not just strings).

## 2.1 Entity Extraction & Classification (NER++)
Extract and classify:

### Hard Skills
Examples:
- Python, SQL, AWS, Terraform, Jira, Docker

### Soft Skills
Examples:
- leadership, communication, stakeholder management

### Job Titles
Examples:
- Project Manager, Delivery Manager, Analyst, VP

### Certifications
Examples:
- PMP, ITIL, AWS Certified, MBA

### Domains / Industries
Examples:
- FinTech, Healthcare, SaaS, Retail

### Methodologies
Examples:
- Agile, Scrum, Kanban, Waterfall

### Platforms / Tools
Examples:
- Salesforce, ServiceNow, Power BI

---

## 2.2 Must-Have vs Nice-to-Have Requirement Isolation
Detect requirement strength from JD language:

### Critical / Must-Have
Triggers:
- “must have”
- “required”
- “essential”
- “minimum X years”
- “proven experience”

Output:
- ✅ **Critical Checklist**

### Preferred / Nice-to-Have
Triggers:
- “nice to have”
- “bonus”
- “preferred”
- “advantageous”

Output:
- ⭐ **Nice-to-have Checklist**

---

## 2.3 Temporal Extraction (Time-in-Seat)
Extract dates and compute experience:

- total years of experience
- years in role family (e.g., PM roles)
- seniority estimation

Example:
- (2024–2020) + (2018–2016) = **6 years**
- Compare vs JD requirement (e.g., **8+ years**)

---

## 2.4 Acronym Expansion & Blind-Spot Detection
Detect and resolve acronym mismatches:

Examples:
- SEO ↔ Search Engine Optimization  
- ETL ↔ Extract Transform Load  
- CI/CD ↔ Continuous Integration / Continuous Delivery  

Rules:
- Recognize acronym ↔ full form as equivalent
- Recommend writing **Full Term (ACRONYM)** at least once

---

## 2.5 Canonical Skill & Title Normalization (Alias Layer)
Create a canonical mapping so scoring is consistent:

Examples:
- “MS Excel” → “Excel”
- “Amazon Web Services” → “AWS”
- “PM” → “Project Management”
- “Delivery Manager” → “Project Manager” (partial equivalence)

**Why:** prevents false penalties due to naming differences.

---

# 3) 🔎 Matching Layer (What counts as a match)
## 3.1 Exact Keyword Match (Lexical)
Direct overlap between JD and CV terms.

- Best for: hard skills, tools, certifications, explicit requirements
- High precision, lower recall

---

## 3.2 Semantic Matching (Embeddings)
Prevent false negatives by matching meaning, not exact terms.

Examples:
- “SaaS Sales” ≈ “Selling cloud software”
- “Stakeholder management” ≈ “Managing senior stakeholders”

**Core requirement:**
- Compute **cosine similarity** between JD and CV vectors

---

## 3.3 Section-Level Matching (IMPORTANT)
Don’t just compare full documents — compare **sections**.

Examples:
- JD Requirements ↔ CV Skills
- JD Responsibilities ↔ CV Experience bullets
- JD Nice-to-have ↔ CV Projects / Tools

**Why:** boosts accuracy and reduces “keyword dump” gaming.

---

## 3.4 Title Matching (Role Equivalence)
Match related job titles with partial credit:

Examples:
- Project Manager ~ Delivery Manager (partial)
- ML Engineer ~ Data Scientist (partial)
- VP Engineering ~ Head of Engineering (strong)

---

# 4) 📊 Scoring Engine (0–100 with Explainability)
## 4.1 Score Components (Hybrid Model)
The score is a blend of:

### A) Lexical Score (Keyword + Rules)
- exact match
- frequency weighting (TF-style)
- must-have checklist completion
- acronym + alias resolution

### B) Semantic Score (Embeddings)
- meaning-based similarity across:
  - overall JD ↔ overall CV
  - section-to-section similarity (preferred)

### C) Evidence Score (Proof Strength)
Measures whether skills are supported by context:
- achievement bullets
- actions + outcomes
- metrics (“reduced cost by 15%”)

### D) Constraints / Gates (Eligibility)
Hard rules that cap or fail the score:
- required certifications missing
- required minimum years missing
- must-have skills missing

---

## 4.2 Recommended Weighting (Tunable)
Example weighting for a balanced system:

> **Final Score = (Lexical×0.55) + (Semantic×0.35) + (Evidence×0.10)**

Then apply:
- **Constraint penalties / caps** (must-haves, years, certs)

---

## 4.3 Weighted Scoring Categories (Sub-scores)
Score combines weighted signals:

- Hard skills match (**highest weight**)
- Soft skills match
- Title match
- Experience / tenure match
- Domain / industry match
- Tools / platform match
- Education / certifications match

Example formula (classic baseline):
> **Score = (H×0.4) + (S×0.2) + (T×0.2) + (E×0.2)**

Where:
- **H** = Hard Skills match  
- **S** = Soft Skills match  
- **T** = Title match  
- **E** = Experience match  

---

## 4.4 Weighted Keyword Frequency (TF-style)
Measure term frequency in JD vs CV:

- JD mentions skill frequently → higher importance
- Missing high-frequency JD skill → big penalty

Example:
- JD: “Project Management” x5  
- CV: “Project Management” x0  
→ **major penalty**

---

## 4.5 “Goldilocks” Keyword Stuffing Detection
Prevent spam/cheating:

Detect:
- unnatural repetition
- dumping keywords without evidence
- hidden text patterns (if rich-text parsing is supported)

Response:
- apply stuffing penalty
- reduce credibility / quality score

---

## 4.6 Contextual Placement Scoring (Evidence Weighting)
Where a keyword appears matters:

### Low Value
- keyword only appears in a skills list

### High Value
- keyword appears inside an achievement with context + outcome  
Example:
> “Used Python to automate reporting, reducing cycle time by 40%.”

**Bonus signals (Evidence Score):**
- numbers (% reduction, £ saved, time saved)
- scope (team size, budget size, stakeholders)
- ownership language (“led”, “delivered”, “owned”)

---

## 4.7 Critical Requirement Gating (Fail-Fast Rules)
If critical requirements are missing, score is capped or flagged.

Examples:
- required certification missing
- required minimum years not met
- must-have skill absent

Output label:
- ✅ Eligible  
- ⚠️ At Risk  
- ❌ Not Eligible  

---

## 4.8 Embedding Safety Rails (Anti-False-Positive)
Semantic similarity can over-match vague text, so apply guardrails:

Only award strong semantic points when:
- the match occurs in a **high-value section** (Experience/Projects)
- AND/OR the match is supported by **hard entities** (tools, certs, years)

Example:
- “Cloud experience” ≠ strong match unless AWS/Azure/GCP appears somewhere credible.

---

# 5) 🧩 Gap Analysis & Recommendations (Candidate Feedback)
## 5.1 Critical Gap List (“Kill List”)
Generate missing high-impact requirements:

For each missing item show:
- missing term
- importance (frequency in JD)
- where to add it (skills vs experience)
- recommended phrasing

Example:
> “Missing: Budget Management (appears 4x in JD). Add to experience bullets to raise score above 50.”

---

## 5.2 Weak Evidence Detection (Claim vs Proof)
Detect when a skill is present but unsupported:

- listed but not demonstrated
- appears without achievements or metrics

Recommendation:
- add an evidence bullet with outcome/impact

Example recommendation format:
- **Before:** “Stakeholder management”
- **After:** “Managed 12 senior stakeholders across Product + Ops, reducing delivery blockers by 30%.”

---

## 5.3 Semantic Gap Detection (Next-Level Feedback)
Detect missing *concepts*, not just missing words.

Example:
- JD implies “budget ownership”
- CV says “managed projects” but never mentions budgets/costs

Output:
> “Your CV shows delivery ownership, but lacks evidence of financial responsibility (budgets, forecasting, cost control).”

---

## 5.4 Experience Gap Reporting
Show:
- required years vs detected years
- seniority mismatch indicators

---

## 5.5 ATS Hygiene / Formatting Flags
Detect and warn:
- missing section headings
- inconsistent date formats
- long dense paragraphs
- vague phrases (“responsible for…”)
- spelling/grammar issues

---

# 6) 🖥️ Dashboard / UI Requirements
## 6.1 Heatmap Overlay (In-Text Highlighting)
Visual feedback on CV:

- 🟩 Green = strong match + good evidence
- 🟨 Yellow = weak match / generic wording
- 🟥 Red = missing / risky / vague

---

## 6.2 Live Scoreboard (Real-time Updates)
As the user edits:
- score updates instantly
- sub-scores update too
- makes optimization feel “game-like” (but useful)

---

## 6.3 Explainability Panel (“Why this score?”)
Must show:
- top matched requirements
- biggest penalties
- critical checklist completion %
- lexical vs semantic contribution breakdown (recommended)

---

## 6.4 Progress Tracking / Versioning
Track improvement over time:

- score history per JD
- “CV v3 improved +12 points”

---

# 7) ⚙️ Customization & Power Controls
## 7.1 Adjustable Weighting (Presets + Manual)
Allow presets like:
- Technical role
- Leadership role
- Junior role
- Contract role

Or manual sliders:
- Hard skills weight ↑
- Soft skills weight ↓
- Experience weight ↑
- Semantic weight ↑/↓

---

## 7.2 Role-Specific Dictionaries (“Skill Packs”)
Examples:
- Project Management pack (RAID, delivery, governance)
- Data pack (SQL, Python, ETL, dashboards)
- Cloud pack (AWS, IaC, security, networking)

---

## 7.3 Industry Sensitivity
Tune scoring for regulated sectors:
- finance / healthcare / government
- compliance-heavy roles (GDPR, ISO, ITIL)

---

# 8) 🏗️ System Requirements (Engineering)
## 8.1 Performance & Scale
- fast scoring (sub-second ideal for live updates)
- handle many CV/JD comparisons

**Tip:** embeddings can be cached per document/section for speed.

---

## 8.2 Privacy & Security
- encryption in transit + at rest
- GDPR-friendly design (UK/EU)
- retention controls (delete user data)

---

## 8.3 Integration Readiness (Optional but valuable)
- API-first scoring endpoint
- export results as JSON
- integrations with job boards / HR platforms

---

## 8.4 Continuous Updates
- update skill taxonomy + synonyms over time
- allow admin overrides + new term additions
- update acronym/alias dictionaries

---

# ✅ Output Contract (What the engine must return)
For every CV + JD comparison, return:

- Overall score (0–100)
- Sub-scores (skills / titles / experience / certs / soft skills)
- Lexical vs Semantic vs Evidence breakdown
- Critical must-have pass/fail + checklist completion %
- Missing critical terms list
- Weak evidence terms list
- Suggested improvements (with placement guidance)
- Heatmap annotations (for UI rendering)

---
