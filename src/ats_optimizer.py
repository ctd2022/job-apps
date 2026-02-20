#!/usr/bin/env python3
"""
ATS Optimization Module (Enhanced)
Analyzes job descriptions and optimizes CVs for Applicant Tracking Systems
Features: N-gram extraction, synonym matching, weighted scoring, LLM integration,
          Section-level matching, Evidence-weighted scoring (Track 2.8),
          Semantic similarity scoring (Track 2.8.2)
"""

import re
from collections import Counter
from llm_backend import LLMBackend
from document_parser import (
    DocumentParser, ParsedCV, ParsedJD,
    CVSectionType, JDSectionType, EntityType, Entity
)
from semantic_scorer import SemanticScorer, SemanticScoreResult


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
            'all', 'each', 'every', 'both', 'few', 'more', 'most', 'some', 'such',
            'into', 'through', 'above', 'below', 'between', 'under', 'over',
            'out', 'up', 'down', 'off', 'then', 'than', 'so', 'just', 'also',
            'very', 'too', 'any', 'only', 'own', 'same', 'no', 'not', 'now'
        }

        # Job posting UI/navigation words (common across job sites)
        self.ui_stopwords = {
            'apply', 'job', 'save', 'show', 'view', 'click', 'here', 'read',
            'more', 'less', 'back', 'next', 'previous', 'search', 'filter',
            'sort', 'share', 'print', 'email', 'download', 'upload', 'submit',
            'send', 'post', 'date', 'ago', 'day', 'week', 'month', 'year',
            'new', 'updated', 'end', 'start', 'while', 'during', 'about',
            'our', 'your', 'their', 'its', 'my', 'we', 'us'
        }

        # Job posting boilerplate words (appear in most job postings)
        self.job_posting_stopwords = {
            'responsibilities', 'responsibility', 'requirements', 'requirement',
            'qualifications', 'qualification', 'preferred', 'required', 'must',
            'candidate', 'candidates', 'position', 'role', 'opportunity',
            'looking', 'seeking', 'hiring', 'join', 'team', 'company',
            'ideal', 'strong', 'excellent', 'good', 'great', 'best',
            'ability', 'able', 'skills', 'skill', 'experience', 'experienced',
            'knowledge', 'understanding', 'familiar', 'familiarity',
            'work', 'working', 'environment', 'based', 'including', 'includes',
            'well', 'within', 'across', 'using', 'used', 'use',
            'ensure', 'ensuring', 'provide', 'providing', 'support', 'supporting',
            'develop', 'developing', 'development', 'create', 'creating',
            'manage', 'managing', 'management', 'lead', 'leading',
            'build', 'building', 'design', 'designing', 'implement', 'implementing',
            'etc', 'other', 'others', 'various', 'multiple', 'different',
            'minimum', 'maximum', 'least', 'plus', 'years', 'year',
            'full', 'time', 'part', 'remote', 'onsite', 'hybrid', 'office',
            'salary', 'benefits', 'compensation', 'package', 'competitive',
            'equal', 'employer', 'employment', 'applicants', 'applicant'
        }

        # Common tech abbreviation mappings (abbreviation -> [full forms])
        self.abbreviation_map = {
            'js': ['javascript'],
            'ts': ['typescript'],
            'py': ['python'],
            'rb': ['ruby'],
            'ml': ['machine learning'],
            'ai': ['artificial intelligence'],
            'dl': ['deep learning'],
            'nlp': ['natural language processing'],
            'cv': ['computer vision'],
            'aws': ['amazon web services'],
            'gcp': ['google cloud platform', 'google cloud'],
            'azure': ['microsoft azure'],
            'k8s': ['kubernetes'],
            'docker': ['containerization', 'containers'],
            'ci': ['continuous integration'],
            'cd': ['continuous deployment', 'continuous delivery'],
            'cicd': ['ci/cd', 'continuous integration', 'continuous deployment'],
            'api': ['apis', 'rest api', 'restful'],
            'sql': ['mysql', 'postgresql', 'database'],
            'nosql': ['mongodb', 'dynamodb', 'non-relational'],
            'db': ['database', 'databases'],
            'ui': ['user interface'],
            'ux': ['user experience'],
            'qa': ['quality assurance', 'testing'],
            'pm': ['project management', 'product management'],
            'scrum': ['agile', 'sprint'],
            'agile': ['scrum', 'kanban', 'sprint'],
            'oop': ['object oriented programming', 'object-oriented'],
            'fp': ['functional programming'],
            'tdd': ['test driven development', 'test-driven'],
            'bdd': ['behavior driven development'],
            'saas': ['software as a service'],
            'paas': ['platform as a service'],
            'iaas': ['infrastructure as a service'],
            'rest': ['restful', 'rest api'],
            'graphql': ['graph ql'],
            'react': ['reactjs', 'react.js'],
            'vue': ['vuejs', 'vue.js'],
            'angular': ['angularjs', 'angular.js'],
            'node': ['nodejs', 'node.js'],
            'express': ['expressjs', 'express.js'],
            'django': ['python django'],
            'flask': ['python flask'],
            'spring': ['spring boot', 'spring framework'],
            'dotnet': ['.net', 'dot net', 'asp.net'],
            'tf': ['tensorflow'],
            'pytorch': ['torch'],
            'pandas': ['data analysis'],
            'numpy': ['numerical python'],
            'git': ['github', 'gitlab', 'version control'],
            'linux': ['unix', 'ubuntu', 'centos', 'redhat'],
            'bash': ['shell', 'shell scripting'],
            'powershell': ['windows scripting'],
            'html': ['html5'],
            'css': ['css3', 'styling'],
            'sass': ['scss'],
            'jwt': ['json web token', 'authentication'],
            'oauth': ['oauth2', 'authentication'],
            'sso': ['single sign-on'],
            'sdk': ['software development kit'],
            'ide': ['integrated development environment'],
            'vscode': ['visual studio code'],
            'jira': ['atlassian', 'issue tracking'],
            'confluence': ['atlassian', 'documentation'],
            'slack': ['team communication'],
            'etl': ['extract transform load', 'data pipeline'],
            'bi': ['business intelligence'],
            'kpi': ['key performance indicator', 'metrics'],
            'roi': ['return on investment'],
            'b2b': ['business to business'],
            'b2c': ['business to consumer'],
            'crm': ['customer relationship management', 'salesforce'],
            'erp': ['enterprise resource planning'],
            'hr': ['human resources'],
            'devops': ['dev ops', 'development operations'],
            'sre': ['site reliability engineering', 'site reliability'],
            'sla': ['service level agreement'],
            'cdn': ['content delivery network'],
            'dns': ['domain name system'],
            'ssl': ['tls', 'https', 'security'],
            'vpc': ['virtual private cloud'],
            'ec2': ['elastic compute', 'aws compute'],
            's3': ['aws storage', 'object storage'],
            'rds': ['relational database service'],
            'lambda': ['serverless', 'aws lambda'],
        }

        # Role/title suffix variations (manager <-> management, etc.)
        self.role_variations = {
            'manager': ['management', 'managing'],
            'management': ['manager', 'managing'],
            'engineer': ['engineering'],
            'engineering': ['engineer'],
            'developer': ['development', 'developing'],
            'development': ['developer', 'developing'],
            'analyst': ['analysis', 'analytics', 'analyzing'],
            'analysis': ['analyst', 'analytics'],
            'analytics': ['analyst', 'analysis'],
            'architect': ['architecture', 'architecting'],
            'architecture': ['architect'],
            'administrator': ['administration', 'admin'],
            'administration': ['administrator', 'admin'],
            'admin': ['administrator', 'administration'],
            'consultant': ['consulting', 'consultancy'],
            'consulting': ['consultant', 'consultancy'],
            'director': ['directing', 'directorship'],
            'lead': ['leader', 'leading', 'leadership'],
            'leader': ['lead', 'leading', 'leadership'],
            'leadership': ['lead', 'leader', 'leading'],
            'coordinator': ['coordination', 'coordinating'],
            'coordination': ['coordinator', 'coordinating'],
            'specialist': ['specialization', 'specialized'],
            'supervisor': ['supervision', 'supervising'],
            'programme': ['program', 'programs', 'programmes'],
            'program': ['programme', 'programs', 'programmes'],
            'project': ['projects'],
            'projects': ['project'],
        }

        # Build reverse mapping (full form -> abbreviation)
        self.reverse_abbreviation_map = {}
        for abbr, full_forms in self.abbreviation_map.items():
            for full_form in full_forms:
                if full_form not in self.reverse_abbreviation_map:
                    self.reverse_abbreviation_map[full_form] = []
                self.reverse_abbreviation_map[full_form].append(abbr)

        # Initialize dynamic stopwords
        self.dynamic_stopwords = set()
        if company_name:
            self._add_company_variations(company_name)

        # Initialize document parser for section-level analysis (Track 2.8)
        self.document_parser = DocumentParser()

        # Initialize semantic scorer for semantic similarity (Track 2.8.2)
        self.semantic_scorer = SemanticScorer()

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
        patterns = [
            r'(?:company|organization|employer):\s*([A-Z][A-Za-z\s&]+?)(?:\n|\.|,)',
            r'(?:join|at)\s+([A-Z][A-Za-z\s&]+?)\s+(?:as|in|for)',
            r'^([A-Z][A-Za-z\s&]+?)\s+is\s+(?:seeking|looking|hiring)'
        ]

        for pattern in patterns:
            match = re.search(pattern, job_description, re.MULTILINE | re.IGNORECASE)
            if match:
                company = match.group(1).strip()
                if len(company.split()) <= 4:
                    return company

        return None

    def get_all_stopwords(self):
        """Get combined set of all stopwords"""
        return (self.base_stopwords | self.ui_stopwords |
                self.job_posting_stopwords | self.dynamic_stopwords)

    def _normalize_text(self, text: str) -> str:
        """Normalize text for keyword extraction"""
        # Convert to lowercase
        text = text.lower()
        # Normalize common variations
        text = re.sub(r'\.js\b', 'js', text)  # React.js -> Reactjs
        text = re.sub(r'\.net\b', 'dotnet', text)  # .NET -> dotnet
        text = re.sub(r'\bci/cd\b', 'cicd', text)  # CI/CD -> cicd
        text = re.sub(r'\bc\+\+\b', 'cpp', text)  # C++ -> cpp
        text = re.sub(r'\bc#\b', 'csharp', text)  # C# -> csharp
        text = re.sub(r'\bf#\b', 'fsharp', text)  # F# -> fsharp
        # Remove special chars but keep hyphens for compound words
        text = re.sub(r'[^\w\s\-]', ' ', text)
        return text

    def extract_ngrams(self, text: str, n: int = 2) -> list:
        """Extract n-grams from text"""
        words = text.split()
        ngrams = []
        for i in range(len(words) - n + 1):
            ngram = ' '.join(words[i:i+n])
            ngrams.append(ngram)
        return ngrams

    def extract_keywords(self, text: str, auto_detect_company: bool = True) -> dict:
        """
        Extract important keywords from text including:
        - Single words (unigrams)
        - Two-word phrases (bigrams)
        - Three-word phrases (trigrams)

        Returns dict with 'unigrams', 'bigrams', 'trigrams', and 'all' counters
        """
        # Auto-detect company name if not provided and requested
        if auto_detect_company and not self.company_name:
            detected_company = self._extract_company_from_text(text)
            if detected_company:
                self._add_company_variations(detected_company)

        # Normalize text
        normalized = self._normalize_text(text)

        # Get all stopwords
        all_stopwords = self.get_all_stopwords()

        # Extract unigrams (single words, min 2 chars)
        words = re.findall(r'\b[a-z][a-z0-9\-]{1,}\b', normalized)
        unigrams = [w for w in words if w not in all_stopwords and len(w) >= 2]

        # Extract bigrams (2-word phrases)
        bigrams = []
        for bigram in self.extract_ngrams(normalized, 2):
            words_in_bigram = bigram.split()
            # Keep if at least one word is not a stopword
            if any(w not in all_stopwords and len(w) >= 2 for w in words_in_bigram):
                # Skip if all words are stopwords
                if not all(w in all_stopwords for w in words_in_bigram):
                    bigrams.append(bigram)

        # Extract trigrams (3-word phrases)
        trigrams = []
        for trigram in self.extract_ngrams(normalized, 3):
            words_in_trigram = trigram.split()
            # Keep if at least two words are meaningful
            meaningful = [w for w in words_in_trigram if w not in all_stopwords and len(w) >= 2]
            if len(meaningful) >= 2:
                trigrams.append(trigram)

        return {
            'unigrams': Counter(unigrams),
            'bigrams': Counter(bigrams),
            'trigrams': Counter(trigrams),
            'all': Counter(unigrams)  # For backward compatibility
        }

    def _expand_with_synonyms(self, keywords: set) -> set:
        """Expand keyword set with known synonyms/abbreviations and role variations"""
        expanded = set(keywords)

        for keyword in keywords:
            keyword_lower = keyword.lower()

            # Check if it's an abbreviation
            if keyword_lower in self.abbreviation_map:
                expanded.update(self.abbreviation_map[keyword_lower])

            # Check if it has an abbreviation
            if keyword_lower in self.reverse_abbreviation_map:
                expanded.update(self.reverse_abbreviation_map[keyword_lower])

            # Check role variations (manager <-> management, etc.)
            if keyword_lower in self.role_variations:
                expanded.update(self.role_variations[keyword_lower])

            # For multi-word phrases, expand each word
            words = keyword_lower.split()
            if len(words) > 1:
                for i, word in enumerate(words):
                    if word in self.role_variations:
                        for variation in self.role_variations[word]:
                            new_phrase = ' '.join(words[:i] + [variation] + words[i+1:])
                            expanded.add(new_phrase)

        return expanded

    def _parse_llm_requirements(self, llm_output: str) -> dict:
        """Parse the structured output from LLM requirement identification"""
        result = {
            'hard_skills': [],
            'soft_skills': [],
            'qualifications': [],
            'critical_keywords': [],
            'required': [],  # Keywords marked as "required"/"must have"
            'preferred': []  # Keywords marked as "preferred"/"nice to have"
        }

        current_section = None

        for line in llm_output.split('\n'):
            line = line.strip()
            if not line:
                continue

            line_lower = line.lower()

            if line_lower.startswith('hard skills:'):
                current_section = 'hard_skills'
                content = line.split(':', 1)[1].strip()
            elif line_lower.startswith('soft skills:'):
                current_section = 'soft_skills'
                content = line.split(':', 1)[1].strip()
            elif line_lower.startswith('qualifications:') or line_lower.startswith('required qualifications:'):
                current_section = 'qualifications'
                content = line.split(':', 1)[1].strip()
            elif line_lower.startswith('critical keywords:'):
                current_section = 'critical_keywords'
                content = line.split(':', 1)[1].strip()
            elif line_lower.startswith('required:') or line_lower.startswith('must have:'):
                current_section = 'required'
                content = line.split(':', 1)[1].strip()
            elif line_lower.startswith('preferred:') or line_lower.startswith('nice to have:'):
                current_section = 'preferred'
                content = line.split(':', 1)[1].strip()
            else:
                content = line

            if current_section and content:
                # Split by comma and clean up
                items = [item.strip() for item in content.split(',') if item.strip()]
                result[current_section].extend(items)

        return result

    def identify_key_requirements(self, job_description: str) -> str:
        """Use LLM to identify critical requirements and keywords"""

        system_message = """You extract keywords from job descriptions. Output ONLY the structured format requested. DO NOT add any preamble, explanation, or commentary. Start your response directly with "HARD SKILLS:" - no other text before it."""

        prompt = f"""Extract keywords from this job description into the exact format below.

{job_description}

---
HARD SKILLS: keyword1, keyword2, keyword3
SOFT SKILLS: keyword1, keyword2, keyword3
QUALIFICATIONS: requirement1, requirement2
CRITICAL KEYWORDS: keyword1, keyword2, keyword3
REQUIRED: skill1, skill2, skill3
PREFERRED: skill1, skill2, skill3"""

        messages = [
            {'role': 'system', 'content': system_message},
            {'role': 'user', 'content': prompt}
        ]

        response = self.backend.chat(messages, temperature=0.3, max_tokens=1024)

        # Clean up any preamble/thinking the LLM might have added
        return self._clean_llm_output(response)

    def _clean_llm_output(self, text: str) -> str:
        """Remove LLM preamble and keep only the structured output."""
        lines = text.strip().split('\n')
        cleaned_lines = []
        started = False

        valid_headers = ['HARD SKILLS:', 'SOFT SKILLS:', 'QUALIFICATIONS:',
                        'CRITICAL KEYWORDS:', 'REQUIRED:', 'PREFERRED:']

        for line in lines:
            line_stripped = line.strip()
            line_upper = line_stripped.upper()

            # Start capturing when we see a valid section header
            if any(line_upper.startswith(header) for header in valid_headers):
                started = True

            # Only capture lines after we've started (skip preamble)
            if started:
                # Stop if we hit thinking/explanation text mid-output
                line_lower = line_stripped.lower()
                if any(phrase in line_lower for phrase in
                       ['however,', 'upon re-reading', 'i realized', 'i found',
                        'let me', 'note that', 'additionally,', 'note:',
                        'here is the', 'i have', 'based on']):
                    # Only break if this line doesn't contain a valid header
                    if not any(line_upper.startswith(header) for header in valid_headers):
                        break
                cleaned_lines.append(line)

        return '\n'.join(cleaned_lines) if cleaned_lines else text

    def _calculate_section_match(self, parsed_cv: ParsedCV, parsed_jd: ParsedJD) -> dict:
        """
        Calculate section-level matching between CV and JD.
        Maps JD Requirements -> CV sections to find where skills are demonstrated.
        """
        section_matches = {
            'experience_matches': [],  # Skills found in experience section
            'skills_matches': [],      # Skills found in skills section
            'projects_matches': [],    # Skills found in projects section
            'other_matches': [],       # Skills found elsewhere
            'not_found': []            # Required skills not found
        }

        # Get required skills from JD
        jd_required = {e.text.lower() for e in parsed_jd.required_entities}
        jd_preferred = {e.text.lower() for e in parsed_jd.preferred_entities}
        all_jd_skills = jd_required | jd_preferred

        # Check each CV entity and categorize by section
        cv_skills_by_section = {}
        for entity in parsed_cv.entities:
            skill_lower = entity.text.lower()
            section = entity.section or 'unknown'
            if section not in cv_skills_by_section:
                cv_skills_by_section[section] = set()
            cv_skills_by_section[section].add(skill_lower)

        # Find where each JD skill appears in CV
        for skill in all_jd_skills:
            found = False
            if skill in cv_skills_by_section.get('experience', set()):
                section_matches['experience_matches'].append(skill)
                found = True
            elif skill in cv_skills_by_section.get('projects', set()):
                section_matches['projects_matches'].append(skill)
                found = True
            elif skill in cv_skills_by_section.get('skills', set()):
                section_matches['skills_matches'].append(skill)
                found = True
            else:
                # Check all sections
                for section, skills in cv_skills_by_section.items():
                    if skill in skills:
                        section_matches['other_matches'].append(skill)
                        found = True
                        break

            if not found:
                section_matches['not_found'].append(skill)

        return section_matches

    def _generate_actionable_suggestions(
        self,
        section_matches: dict,
        semantic_result: SemanticScoreResult,
        scores: dict
    ) -> list[dict]:
        """Generate actionable suggestions with section recommendations."""
        suggestions = []

        # Map categories to priority
        priority_order = [
            ('critical_keywords', 'critical'),
            ('required', 'required'),
            ('hard_skills', 'hard_skills'),
            ('preferred', 'preferred')
        ]

        # Collect all missing skills with their source category
        missing_by_priority: list[tuple[str, str]] = []
        for cat_key, priority in priority_order:
            if cat_key in scores:
                for skill in scores[cat_key]['missing'][:5]:  # Top 5 per category
                    missing_by_priority.append((skill, priority))

        # Also include not_found from section analysis
        for skill in section_matches['not_found'][:5]:
            if not any(s[0] == skill for s in missing_by_priority):
                missing_by_priority.append((skill, 'required'))

        # Get section similarities for recommendations
        section_scores = semantic_result.section_similarities if semantic_result else {}

        # Section mapping: recommend where skill would have most impact
        section_priority = ['experience', 'projects', 'skills']

        for skill, priority in missing_by_priority[:10]:  # Limit to 10 suggestions
            # Find best section (lowest current similarity = most room to improve)
            best_section = 'skills'  # default
            best_score = 100.0

            for section in section_priority:
                score = section_scores.get(section, 50.0)
                if score < best_score:
                    best_score = score
                    best_section = section

            suggestions.append({
                'skill': skill,
                'priority': priority,
                'recommended_section': best_section,
                'section_score': round(best_score, 1),
                'reason': f"Add to {best_section.title()} section to improve alignment"
            })

        return suggestions

    def _calculate_evidence_scores(self, parsed_cv: ParsedCV, parsed_jd: ParsedJD) -> dict:
        """
        Calculate evidence-weighted scores for skills.
        Skills demonstrated in Experience with metrics are weighted higher.
        """
        evidence_results = {
            'strong_evidence': [],    # High evidence strength (>1.3)
            'moderate_evidence': [],  # Moderate evidence (1.0-1.3)
            'weak_evidence': [],      # Listed but not demonstrated (<1.0)
            'average_strength': 0.0,
            'total_weighted_score': 0.0
        }

        # Get required skills from JD
        jd_skills = {e.text.lower() for e in parsed_jd.entities
                     if e.entity_type in (EntityType.HARD_SKILL, EntityType.SOFT_SKILL)}

        # Calculate evidence for each matched skill
        total_strength = 0.0
        count = 0

        for entity in parsed_cv.entities:
            skill_lower = entity.text.lower()
            if skill_lower in jd_skills:
                count += 1
                total_strength += entity.evidence_strength

                if entity.evidence_strength > 1.3:
                    evidence_results['strong_evidence'].append({
                        'skill': entity.text,
                        'strength': entity.evidence_strength,
                        'section': entity.section
                    })
                elif entity.evidence_strength >= 1.0:
                    evidence_results['moderate_evidence'].append({
                        'skill': entity.text,
                        'strength': entity.evidence_strength,
                        'section': entity.section
                    })
                else:
                    evidence_results['weak_evidence'].append({
                        'skill': entity.text,
                        'strength': entity.evidence_strength,
                        'section': entity.section
                    })

        if count > 0:
            evidence_results['average_strength'] = round(total_strength / count, 2)
            evidence_results['total_weighted_score'] = round(total_strength, 2)

        return evidence_results

    def calculate_hybrid_score(
        self,
        lexical_score: float,
        semantic_result: SemanticScoreResult,
        evidence_strength: float
    ) -> dict:
        """
        Calculate hybrid score combining lexical, semantic, and evidence components.

        Weights (Track 2.8.2):
        - Lexical: 55% (keyword matching)
        - Semantic: 35% (meaning-based similarity)
        - Evidence: 10% (demonstrated skills with metrics)

        Falls back to Lexical 90% + Evidence 10% if semantic unavailable.
        """
        if semantic_result.available:
            # Full hybrid scoring
            lexical_weight = 0.55
            semantic_weight = 0.35
            evidence_weight = 0.10

            semantic_score = semantic_result.score
        else:
            # Fallback: redistribute semantic weight to lexical
            lexical_weight = 0.90
            semantic_weight = 0.0
            evidence_weight = 0.10

            semantic_score = 0.0

        # Normalize evidence strength to 0-100 scale
        # Evidence strength is typically 0.8-2.0, map to 0-100
        evidence_score = min(100, max(0, (evidence_strength - 0.5) / 1.5 * 100))

        # Calculate weighted final score
        final_score = (
            lexical_score * lexical_weight +
            semantic_score * semantic_weight +
            evidence_score * evidence_weight
        )

        return {
            'final_score': round(final_score, 1),
            'lexical_score': round(lexical_score, 1),
            'lexical_weight': lexical_weight,
            'lexical_contribution': round(lexical_score * lexical_weight, 1),
            'semantic_score': round(semantic_score, 1),
            'semantic_weight': semantic_weight,
            'semantic_contribution': round(semantic_score * semantic_weight, 1),
            'evidence_score': round(evidence_score, 1),
            'evidence_weight': evidence_weight,
            'evidence_contribution': round(evidence_score * evidence_weight, 1),
            'semantic_available': semantic_result.available,
        }

    def calculate_ats_score(self, cv_text: str, job_description: str, key_requirements: str) -> dict:
        """
        Calculate how well the CV matches the job description.
        Uses weighted scoring based on:
        - LLM-identified critical keywords (high weight)
        - Required vs preferred skills
        - N-gram matching (phrases worth more than single words)
        - Synonym/abbreviation matching
        - Section-level matching (Track 2.8)
        - Evidence-weighted scoring (Track 2.8)
        """

        # Parse LLM requirements
        parsed_reqs = self._parse_llm_requirements(key_requirements)

        # Parse documents for section-level analysis (Track 2.8)
        parsed_cv = self.document_parser.parse_cv(cv_text)
        parsed_jd = self.document_parser.parse_jd(job_description)

        # Calculate section-level matching
        section_matches = self._calculate_section_match(parsed_cv, parsed_jd)

        # Calculate evidence-weighted scores
        evidence_scores = self._calculate_evidence_scores(parsed_cv, parsed_jd)

        # Calculate semantic similarity score (Track 2.8.2)
        semantic_result = self.semantic_scorer.calculate_semantic_score(parsed_cv, parsed_jd)

        # Extract keywords from both documents
        job_keywords = self.extract_keywords(job_description)
        cv_keywords = self.extract_keywords(cv_text)

        # Build CV keyword sets for matching (including synonyms)
        cv_unigrams = set(cv_keywords['unigrams'].keys())
        cv_bigrams = set(cv_keywords['bigrams'].keys())
        cv_trigrams = set(cv_keywords['trigrams'].keys())
        cv_all_text = self._normalize_text(cv_text)

        # Expand CV keywords with synonyms
        cv_unigrams_expanded = self._expand_with_synonyms(cv_unigrams)

        # Scoring breakdown
        scores = {
            'critical_keywords': {'matched': [], 'missing': [], 'weight': 3.0},
            'hard_skills': {'matched': [], 'missing': [], 'weight': 2.5},
            'required': {'matched': [], 'missing': [], 'weight': 2.0},
            'soft_skills': {'matched': [], 'missing': [], 'weight': 1.5},
            'preferred': {'matched': [], 'missing': [], 'weight': 1.0},
            'frequency_keywords': {'matched': [], 'missing': [], 'weight': 0.5}
        }

        def check_keyword_match(keyword: str, cv_text: str, cv_unigrams: set) -> bool:
            """Check if a keyword or its synonyms appear in CV"""
            keyword_lower = keyword.lower().strip()

            # Direct phrase match in text
            if keyword_lower in cv_text:
                return True

            # Single word match
            if keyword_lower in cv_unigrams:
                return True

            # Check synonyms/abbreviations
            expanded = self._expand_with_synonyms({keyword_lower})
            for variant in expanded:
                if variant in cv_text or variant in cv_unigrams:
                    return True

            return False

        # Score LLM-identified keywords
        for category in ['critical_keywords', 'hard_skills', 'required', 'soft_skills', 'preferred']:
            for keyword in parsed_reqs.get(category, []):
                if check_keyword_match(keyword, cv_all_text, cv_unigrams_expanded):
                    scores[category]['matched'].append(keyword)
                else:
                    scores[category]['missing'].append(keyword)

        # Also check top frequency-based keywords from job description
        top_job_unigrams = [k for k, v in job_keywords['unigrams'].most_common(20)]
        top_job_bigrams = [k for k, v in job_keywords['bigrams'].most_common(15)]

        for keyword in top_job_unigrams:
            if keyword not in cv_unigrams_expanded:
                # Check if not already tracked
                already_tracked = any(
                    keyword.lower() in [k.lower() for k in scores[cat]['matched'] + scores[cat]['missing']]
                    for cat in scores if cat != 'frequency_keywords'
                )
                if not already_tracked:
                    scores['frequency_keywords']['missing'].append(keyword)
            else:
                scores['frequency_keywords']['matched'].append(keyword)

        # Check bigrams (phrases) - these are important!
        matched_bigrams = []
        missing_bigrams = []
        for bigram in top_job_bigrams:
            if bigram in cv_bigrams or bigram in cv_all_text:
                matched_bigrams.append(bigram)
            else:
                missing_bigrams.append(bigram)

        # Calculate weighted score
        total_weight = 0
        weighted_score = 0

        for category, data in scores.items():
            total_items = len(data['matched']) + len(data['missing'])
            if total_items > 0:
                category_score = len(data['matched']) / total_items
                weighted_score += category_score * data['weight'] * total_items
                total_weight += data['weight'] * total_items

        lexical_score = (weighted_score / total_weight * 100) if total_weight > 0 else 0

        # Calculate hybrid score (Track 2.8.2)
        hybrid_scoring = self.calculate_hybrid_score(
            lexical_score,
            semantic_result,
            evidence_scores['average_strength']
        )
        final_score = hybrid_scoring['final_score']

        # Compile results
        all_matched = []
        all_missing = []
        for category, data in scores.items():
            all_matched.extend(data['matched'])
            all_missing.extend(data['missing'])

        # Remove duplicates while preserving order
        seen = set()
        unique_matched = [x for x in all_matched if not (x.lower() in seen or seen.add(x.lower()))]
        seen = set()
        unique_missing = [x for x in all_missing if not (x.lower() in seen or seen.add(x.lower()))]

        return {
            'score': round(final_score, 1),
            'matched': len(unique_matched),
            'total': len(unique_matched) + len(unique_missing),
            'missing_keywords': unique_missing[:15],
            'matched_keywords': unique_matched[:15],
            'top_job_keywords': top_job_unigrams[:15],
            'scores_by_category': {
                cat: {
                    'matched': len(data['matched']),
                    'missing': len(data['missing']),
                    'items_matched': data['matched'][:5],
                    'items_missing': data['missing'][:5]
                }
                for cat, data in scores.items()
            },
            'matched_phrases': matched_bigrams[:10],
            'missing_phrases': missing_bigrams[:10],
            # Track 2.8: Section-level analysis
            'section_analysis': {
                'experience_matches': section_matches['experience_matches'][:10],
                'skills_matches': section_matches['skills_matches'][:10],
                'projects_matches': section_matches['projects_matches'][:5],
                'not_found_in_cv': section_matches['not_found'][:10],
                'cv_sections_detected': len(parsed_cv.sections),
                'jd_sections_detected': len(parsed_jd.sections),
            },
            # Track 2.8: Evidence-weighted scoring
            'evidence_analysis': {
                'strong_evidence_count': len(evidence_scores['strong_evidence']),
                'moderate_evidence_count': len(evidence_scores['moderate_evidence']),
                'weak_evidence_count': len(evidence_scores['weak_evidence']),
                'average_strength': evidence_scores['average_strength'],
                'strong_skills': [e['skill'] for e in evidence_scores['strong_evidence'][:5]],
                'weak_skills': [e['skill'] for e in evidence_scores['weak_evidence'][:5]],
            },
            # Track 2.8: Extracted entities summary
            'parsed_entities': {
                'cv_hard_skills': list(parsed_cv.get_hard_skills())[:15],
                'cv_soft_skills': list(parsed_cv.get_soft_skills())[:10],
                'jd_required_skills': list(parsed_jd.get_required_skills())[:15],
                'jd_preferred_skills': list(parsed_jd.get_preferred_skills())[:10],
                'cv_years_experience': parsed_cv.years_experience,
                'jd_years_required': parsed_jd.years_required,
            },
            # Track 2.8.2: Hybrid scoring breakdown
            'hybrid_scoring': hybrid_scoring,
            # Track 2.8.2: Semantic analysis
            'semantic_analysis': {
                'available': semantic_result.available,
                'score': semantic_result.score,
                'section_similarities': semantic_result.section_similarities,
                'top_matches': [
                    {
                        'jd_section': m.jd_section,
                        'cv_section': m.cv_section,
                        'similarity': m.similarity,
                        'is_high_value': m.is_high_value
                    }
                    for m in semantic_result.top_matches
                ],
                'gaps': semantic_result.gaps,
                'entity_support_ratio': semantic_result.entity_support_ratio,
                'high_value_match_count': semantic_result.high_value_match_count,
            },
            # Track 2.8.4: Enhanced Gap Analysis
            'gap_analysis': {
                'critical_gaps': {
                    'missing_critical_keywords': scores['critical_keywords']['missing'],
                    'missing_required_skills': scores['required']['missing'],
                },
                'evidence_gaps': {
                    'weak_evidence_skills': [e['skill'] for e in evidence_scores['weak_evidence']],
                },
                'semantic_gaps': {
                    'missing_concepts': semantic_result.gaps,
                },
                'experience_gaps': {
                    'cv_years': parsed_cv.years_experience,
                    'jd_years': parsed_jd.years_required,
                    'gap': (parsed_jd.years_required or 0) - (parsed_cv.years_experience or 0)
                },
                # Idea #87: Smart CV Gap Analysis with Actionable Suggestions
                'actionable_suggestions': self._generate_actionable_suggestions(
                    section_matches, semantic_result, scores
                )
            }
        }

    def generate_ats_optimized_cv(self, base_cv: str, job_description: str, key_requirements: str) -> str:
        """Generate CV specifically optimized for ATS scanning"""

        system_message = """You are an expert CV writer specializing in ATS (Applicant Tracking System) optimization.

CRITICAL ATS FORMATTING RULES:
- Use simple, standard section headers: PROFESSIONAL SUMMARY, WORK EXPERIENCE, SKILLS, EDUCATION
- Use standard bullet points (-), no fancy symbols
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

    def incorporate_keywords(
        self,
        cv_text: str,
        job_description: str,
        selected_keywords: list[str],
        weak_skills: list[str] | None = None,
    ) -> str:
        """Incorporate selected missing keywords into CV text via LLM.

        Uses a conservative prompt (temperature 0.3) that forbids fabricating
        experience and instructs the model to skip keywords it cannot place
        naturally. Returns the complete updated CV text.
        """
        keywords_list = "\n".join(f"- {kw}" for kw in selected_keywords)

        weak_section = ""
        if weak_skills:
            weak_list = "\n".join(f"- {s}" for s in weak_skills)
            weak_section = (
                f"\n\nWEAK EVIDENCE SKILLS (strengthen existing mentions, "
                f"add metrics/specifics):\n{weak_list}"
            )

        system_message = (
            "You are an expert CV editor. Your task is to incorporate missing "
            "keywords into an existing CV so it scores higher in ATS systems.\n\n"
            "RULES:\n"
            "- Preserve ALL existing content, structure, and formatting\n"
            "- Insert keywords naturally into the most relevant section\n"
            "- Do NOT fabricate experience, qualifications, or achievements\n"
            "- Do NOT remove or rewrite existing bullet points\n"
            "- If a keyword cannot be placed naturally, SKIP it\n"
            "- For weak-evidence skills, strengthen existing mentions with "
            "metrics or specifics rather than adding new claims\n"
            "- Use the exact keyword phrasing provided\n\n"
            "OUTPUT FORMAT (you MUST follow this exactly):\n"
            "1. Output the COMPLETE updated CV text (no preamble, no commentary)\n"
            "2. Then output a line containing ONLY: ===CHANGELOG===\n"
            "3. Then list each change you made, one per line, e.g.:\n"
            "   - Added \"Kubernetes\" to DevOps bullet in TechCorp role\n"
            "   - Strengthened \"leadership\" mention in Personal Statement "
            "with team size metric\n"
            "   - Skipped \"SAP\" — no natural placement\n\n"
            "Do NOT include ANY text before the CV. Start directly with "
            "the first line of the CV."
        )

        prompt = (
            f"CURRENT CV:\n{cv_text}\n\n"
            f"JOB DESCRIPTION:\n{job_description}\n\n"
            f"KEYWORDS TO INCORPORATE:\n{keywords_list}"
            f"{weak_section}\n\n"
            "Output the updated CV followed by ===CHANGELOG=== and the list "
            "of changes. No preamble."
        )

        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt},
        ]

        return self.backend.chat(messages, temperature=0.3, max_tokens=8192)

    def incorporate_user_experiences(
        self,
        cv_text: str,
        job_description: str,
        user_answers: list[dict],  # [{skill, gap_type, user_content}]
    ) -> str:
        """Incorporate user-provided experiences into CV text via LLM.

        Conservative prompt (temperature 0.3) — only incorporates what the
        user explicitly provided, no fabrication. Returns CV text + ===CHANGELOG===.
        """
        answers_list = "\n".join(
            f"- [{a['gap_type']}] {a['skill']}: \"{a['user_content']}\""
            for a in user_answers
        )

        system_message = (
            "You are an expert CV editor. The user has provided real experiences "
            "they haven't yet documented. Incorporate these into the CV naturally "
            "and concisely.\n\n"
            "RULES:\n"
            "- Only use content the user explicitly provided — do not invent details\n"
            "- Preserve all existing content, structure, and formatting\n"
            "- For evidence gaps: strengthen existing mentions with the user's specific examples\n"
            "- For critical/semantic gaps: add to the most relevant section\n"
            "- If user content is too vague to place naturally, skip that item\n\n"
            "OUTPUT FORMAT (you MUST follow this exactly):\n"
            "1. Output the COMPLETE updated CV text (no preamble, no commentary)\n"
            "2. Then output a line containing ONLY: ===CHANGELOG===\n"
            "3. Then list each change you made, one per line\n\n"
            "Do NOT include ANY text before the CV. Start directly with "
            "the first line of the CV."
        )

        prompt = (
            f"CURRENT CV:\n{cv_text}\n\n"
            f"JOB DESCRIPTION:\n{job_description}\n\n"
            f"USER-PROVIDED EXPERIENCES:\n{answers_list}\n\n"
            "Output the updated CV followed by ===CHANGELOG=== and the list "
            "of changes. No preamble."
        )

        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt},
        ]

        return self.backend.chat(messages, temperature=0.3, max_tokens=8192)

    def suggest_skills(self, cv_text: str, job_description: str) -> list[str]:
        """Use LLM to suggest skills to add to the CV."""
        system_message = (
            "You are an expert CV analyst. Your task is to suggest skills that are "
            "mentioned in the job description but are missing from the CV. "
            "Output ONLY a comma-separated list of skills. "
            "Do NOT add any preamble, explanation, or commentary."
        )

        prompt = (
            f"CV:\n{cv_text}\n\n"
            f"JOB DESCRIPTION:\n{job_description}\n\n"
            "Suggest 5-10 skills that are in the job description but not in the CV. "
            "Output a single line of comma-separated values. For example: "
            "Python, FastAPI, Docker, Kubernetes, AWS"
        )

        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt},
        ]

        response = self.backend.chat(messages, temperature=0.7, max_tokens=256)
        
        # Clean up the response and split into a list
        skills = [skill.strip() for skill in response.split(',') if skill.strip()]
        return skills

    def generate_ats_report(self, cv_text: str, job_description: str) -> tuple:
        """Generate a comprehensive ATS analysis report"""

        print("\n[ATS] Analyzing job description for ATS requirements...")
        key_requirements = self.identify_key_requirements(job_description)

        print("\n[ATS] Calculating ATS match score (enhanced algorithm)...")
        ats_score = self.calculate_ats_score(cv_text, job_description, key_requirements)

        # Build category breakdown table
        category_labels = {
            'critical_keywords': 'Critical Keywords',
            'hard_skills': 'Hard/Technical Skills',
            'required': 'Required Skills',
            'soft_skills': 'Soft Skills',
            'preferred': 'Preferred/Bonus',
            'frequency_keywords': 'Other Keywords'
        }

        # Get hybrid and semantic data
        hybrid_data = ats_score.get('hybrid_scoring', {})
        semantic_data = ats_score.get('semantic_analysis', {})

        # Format report with tables
        report = f"""
================================================================================
              ATS OPTIMIZATION REPORT v3.0 (Hybrid Scoring)
================================================================================

  FINAL SCORE: {ats_score['score']}%    |    Keywords Matched: {ats_score['matched']} / {ats_score['total']}
"""

        if self.company_name:
            report += f"  Company excluded: {self.company_name}\n"

        # Hybrid Scoring Breakdown (Track 2.8.2)
        if hybrid_data:
            report += """
--------------------------------------------------------------------------------
                   HYBRID SCORING BREAKDOWN (Track 2.8.2)
--------------------------------------------------------------------------------
"""
            report += f"  Final Score: {hybrid_data.get('final_score', 0)}%\n\n"
            report += "  Components:\n"
            report += f"    Lexical:   {hybrid_data.get('lexical_score', 0):>5.1f}% x {int(hybrid_data.get('lexical_weight', 0)*100):>2}% = {hybrid_data.get('lexical_contribution', 0):>5.1f}\n"

            if hybrid_data.get('semantic_available', False):
                report += f"    Semantic:  {hybrid_data.get('semantic_score', 0):>5.1f}% x {int(hybrid_data.get('semantic_weight', 0)*100):>2}% = {hybrid_data.get('semantic_contribution', 0):>5.1f}\n"
            else:
                report += "    Semantic:  (unavailable - install sentence-transformers)\n"

            report += f"    Evidence:  {hybrid_data.get('evidence_score', 0):>5.1f}% x {int(hybrid_data.get('evidence_weight', 0)*100):>2}% = {hybrid_data.get('evidence_contribution', 0):>5.1f}\n"

        # Semantic Match Analysis (Track 2.8.2)
        if semantic_data and semantic_data.get('available', False):
            report += """
--------------------------------------------------------------------------------
                   SEMANTIC MATCH ANALYSIS (Track 2.8.2)
--------------------------------------------------------------------------------
"""
            top_matches = semantic_data.get('top_matches', [])
            if top_matches:
                report += "  Top Semantic Matches:\n"
                for i, match in enumerate(top_matches[:5], 1):
                    hv_tag = " [HIGH-VALUE]" if match.get('is_high_value') else ""
                    report += f"    {i}. {match.get('jd_section', '?')} <-> {match.get('cv_section', '?')}: {match.get('similarity', 0):.0f}%{hv_tag}\n"

            gaps = semantic_data.get('gaps', [])
            if gaps:
                report += "\n  Semantic Gaps:\n"
                for gap in gaps[:3]:
                    report += f"    - {gap}\n"

            section_sims = semantic_data.get('section_similarities', {})
            if section_sims:
                report += "\n  Section Similarity Scores:\n"
                for section, sim in section_sims.items():
                    report += f"    - {section}: {sim:.0f}%\n"

        # Category score table
        report += """
--------------------------------------------------------------------------------
                           SCORE BY CATEGORY
--------------------------------------------------------------------------------
  Category                    | Match  | Score | Top Missing
  ----------------------------|--------|-------|-----------------------------
"""
        for cat, label in category_labels.items():
            data = ats_score['scores_by_category'].get(cat, {})
            matched = data.get('matched', 0)
            missing = data.get('missing', 0)
            total = matched + missing
            if total > 0:
                pct = round(matched / total * 100)
                missing_items = ', '.join(data.get('items_missing', [])[:2]) or '-'
                report += f"  {label:<27} | {matched:>2}/{total:<2}  | {pct:>3}%  | {missing_items[:28]}\n"

        # Keywords table
        report += """
--------------------------------------------------------------------------------
                         KEYWORD MATCHING TABLE
--------------------------------------------------------------------------------
"""
        # Create side-by-side matched vs missing
        matched_kw = ats_score['matched_keywords']
        missing_kw = ats_score['missing_keywords']
        max_rows = max(len(matched_kw), len(missing_kw), 1)

        report += "  MATCHED (in your CV)           | MISSING (consider adding)\n"
        report += "  -------------------------------|--------------------------------\n"

        for i in range(min(max_rows, 12)):
            m = matched_kw[i] if i < len(matched_kw) else ''
            n = missing_kw[i] if i < len(missing_kw) else ''
            report += f"  {m:<31} | {n}\n"

        # Phrases table
        matched_phrases = ats_score.get('matched_phrases', [])
        missing_phrases = ats_score.get('missing_phrases', [])

        if matched_phrases or missing_phrases:
            report += """
--------------------------------------------------------------------------------
                       KEY PHRASES (2-word terms)
--------------------------------------------------------------------------------
  MATCHED PHRASES              | MISSING PHRASES
  -----------------------------|--------------------------------
"""
            max_phrase_rows = max(len(matched_phrases), len(missing_phrases), 1)
            for i in range(min(max_phrase_rows, 8)):
                mp = matched_phrases[i] if i < len(matched_phrases) else ''
                np = missing_phrases[i] if i < len(missing_phrases) else ''
                report += f"  {mp:<29} | {np}\n"

        # Section Analysis (Track 2.8)
        section_data = ats_score.get('section_analysis', {})
        evidence_data = ats_score.get('evidence_analysis', {})
        entities_data = ats_score.get('parsed_entities', {})

        if section_data:
            report += """
--------------------------------------------------------------------------------
                    SECTION-LEVEL ANALYSIS (Track 2.8)
--------------------------------------------------------------------------------
"""
            exp_matches = section_data.get('experience_matches', [])
            skills_matches = section_data.get('skills_matches', [])
            not_found = section_data.get('not_found_in_cv', [])

            report += f"  CV Sections Detected: {section_data.get('cv_sections_detected', 0)}\n"
            report += f"  JD Sections Detected: {section_data.get('jd_sections_detected', 0)}\n\n"

            if exp_matches:
                report += f"  Skills demonstrated in EXPERIENCE: {', '.join(exp_matches[:6])}\n"
            if skills_matches:
                report += f"  Skills listed in SKILLS section:   {', '.join(skills_matches[:6])}\n"
            if not_found:
                report += f"  Skills NOT found in CV:            {', '.join(not_found[:6])}\n"

        if evidence_data:
            report += f"""
  Evidence Strength Analysis:
    - Strong evidence (with metrics/context): {evidence_data.get('strong_evidence_count', 0)} skills
    - Moderate evidence:                      {evidence_data.get('moderate_evidence_count', 0)} skills
    - Weak evidence (just listed):            {evidence_data.get('weak_evidence_count', 0)} skills
    - Average evidence strength:              {evidence_data.get('average_strength', 0)}
"""
            strong = evidence_data.get('strong_skills', [])
            if strong:
                report += f"    - Top demonstrated skills: {', '.join(strong[:4])}\n"

        if entities_data:
            years_cv = entities_data.get('cv_years_experience')
            years_jd = entities_data.get('jd_years_required')
            if years_cv or years_jd:
                report += f"\n  Experience: CV shows {years_cv or '?'} years, JD requires {years_jd or '?'} years\n"

        # AI-identified requirements
        report += f"""
--------------------------------------------------------------------------------
                      AI-IDENTIFIED REQUIREMENTS
--------------------------------------------------------------------------------
{key_requirements}
"""

        # Recommendations
        report += """
--------------------------------------------------------------------------------
                          RECOMMENDATIONS
--------------------------------------------------------------------------------
"""
        if ats_score['score'] >= 80:
            report += "  [EXCELLENT] Your CV has strong keyword coverage for this role.\n"
        elif ats_score['score'] >= 60:
            report += "  [GOOD] Good coverage. Focus on adding missing REQUIRED keywords.\n"
        elif ats_score['score'] >= 40:
            report += "  [FAIR] Moderate match. Review the missing keywords and phrases.\n"
        else:
            report += "  [LOW] Low match. Strongly recommend adding more keywords.\n"

        cat_scores = ats_score['scores_by_category']
        if cat_scores.get('required', {}).get('missing', 0) > 0:
            report += "  - PRIORITY: Add missing REQUIRED skills\n"
        if cat_scores.get('hard_skills', {}).get('missing', 0) > 2:
            report += "  - Add more technical/hard skills from job description\n"
        if missing_phrases:
            report += f"  - Add key phrases: {', '.join(missing_phrases[:3])}\n"

        report += """
--------------------------------------------------------------------------------
                      ATS FORMATTING CHECKLIST
--------------------------------------------------------------------------------
  [ ] Simple section headers (EXPERIENCE, SKILLS, EDUCATION)
  [ ] No tables or complex layouts
  [ ] Standard bullet points (- or *)
  [ ] Key skills listed prominently
  [ ] Dates in standard format (Month Year)
================================================================================
"""

        return report, key_requirements, ats_score


def main():
    """Example usage"""
    print("""
ATS Optimization Module (Enhanced)
==================================
Features:
- N-gram extraction (single words + phrases)
- Synonym/abbreviation matching (JS=JavaScript, etc.)
- Weighted scoring (required > preferred)
- LLM-powered requirement analysis
- Category-based score breakdown

This module is integrated into the main workflow.
    """)


if __name__ == "__main__":
    main()
