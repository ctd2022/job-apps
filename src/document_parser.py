#!/usr/bin/env python3
"""
Document Parser Module
Section detection and entity extraction for CVs and job descriptions.
Enables section-level matching and evidence-weighted scoring.
"""

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from entity_taxonomy import (
    HARD_SKILLS, SOFT_SKILLS, CERTIFICATIONS, METHODOLOGIES, DOMAINS,
    JOB_TITLE_PATTERNS, YEARS_EXPERIENCE_PATTERNS,
    ACTION_VERBS, METRIC_PATTERNS
)


# =============================================================================
# ENUMS
# =============================================================================

class CVSectionType(Enum):
    """Section types found in CVs."""
    SUMMARY = "summary"
    SKILLS = "skills"
    EXPERIENCE = "experience"
    EDUCATION = "education"
    CERTIFICATIONS = "certifications"
    PROJECTS = "projects"
    CONTACT = "contact"
    UNKNOWN = "unknown"


class JDSectionType(Enum):
    """Section types found in job descriptions."""
    OVERVIEW = "overview"
    RESPONSIBILITIES = "responsibilities"
    REQUIREMENTS = "requirements"
    PREFERRED = "preferred"
    QUALIFICATIONS = "qualifications"
    BENEFITS = "benefits"
    ABOUT = "about"
    UNKNOWN = "unknown"


class EntityType(Enum):
    """Classification of extracted entities."""
    HARD_SKILL = "hard_skill"
    SOFT_SKILL = "soft_skill"
    CERTIFICATION = "certification"
    METHODOLOGY = "methodology"
    DOMAIN = "domain"
    JOB_TITLE = "job_title"
    YEARS_EXPERIENCE = "years_experience"
    METRIC = "metric"


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class Entity:
    """An extracted entity with context."""
    text: str
    entity_type: EntityType
    section: Optional[str] = None
    evidence_strength: float = 1.0
    context: str = ""  # Surrounding text for context

    def __hash__(self):
        return hash((self.text.lower(), self.entity_type))

    def __eq__(self, other):
        if not isinstance(other, Entity):
            return False
        return self.text.lower() == other.text.lower() and self.entity_type == other.entity_type


@dataclass
class Section:
    """A parsed document section."""
    section_type: CVSectionType | JDSectionType
    title: str
    content: str
    start_line: int
    end_line: int
    entities: list[Entity] = field(default_factory=list)


@dataclass
class ParsedCV:
    """Fully parsed CV document."""
    raw_text: str
    sections: list[Section] = field(default_factory=list)
    entities: list[Entity] = field(default_factory=list)
    years_experience: Optional[int] = None
    job_titles: list[str] = field(default_factory=list)

    def get_entities_by_type(self, entity_type: EntityType) -> list[Entity]:
        """Get all entities of a specific type."""
        return [e for e in self.entities if e.entity_type == entity_type]

    def get_entities_in_section(self, section_type: CVSectionType) -> list[Entity]:
        """Get all entities from a specific section type."""
        return [e for e in self.entities if e.section == section_type.value]

    def get_hard_skills(self) -> set[str]:
        """Get unique hard skills."""
        return {e.text.lower() for e in self.entities if e.entity_type == EntityType.HARD_SKILL}

    def get_soft_skills(self) -> set[str]:
        """Get unique soft skills."""
        return {e.text.lower() for e in self.entities if e.entity_type == EntityType.SOFT_SKILL}


@dataclass
class ParsedJD:
    """Fully parsed job description."""
    raw_text: str
    sections: list[Section] = field(default_factory=list)
    entities: list[Entity] = field(default_factory=list)
    required_entities: list[Entity] = field(default_factory=list)
    preferred_entities: list[Entity] = field(default_factory=list)
    years_required: Optional[int] = None
    job_title: Optional[str] = None

    def get_entities_by_type(self, entity_type: EntityType) -> list[Entity]:
        """Get all entities of a specific type."""
        return [e for e in self.entities if e.entity_type == entity_type]

    def get_required_skills(self) -> set[str]:
        """Get required hard and soft skills."""
        return {e.text.lower() for e in self.required_entities
                if e.entity_type in (EntityType.HARD_SKILL, EntityType.SOFT_SKILL)}

    def get_preferred_skills(self) -> set[str]:
        """Get preferred/nice-to-have skills."""
        return {e.text.lower() for e in self.preferred_entities
                if e.entity_type in (EntityType.HARD_SKILL, EntityType.SOFT_SKILL)}


# =============================================================================
# SECTION DETECTOR
# =============================================================================

class SectionDetector:
    """Regex-based section boundary detection."""

    # CV section header patterns
    CV_SECTION_PATTERNS = {
        CVSectionType.SUMMARY: [
            r"\b(professional\s+)?summary\b",
            r"\bprofile\b",
            r"\bobjective\b",
            r"\babout\s*me\b",
            r"\bpersonal\s+statement\b",
            r"\bcareer\s+summary\b",
            r"\bexecutive\s+summary\b",
        ],
        CVSectionType.SKILLS: [
            r"\b(core\s+|technical\s+|key\s+)?skills\b",
            r"\bcompetencies\b",
            r"\bexpertise\b",
            r"\btechnical\s+proficiencies\b",
            r"\bproficiencies\b",
            r"\btechnologies\b",
            r"\btools?\s*(&|and)\s*technologies\b",
        ],
        CVSectionType.EXPERIENCE: [
            r"\b(work\s+|professional\s+)?experience\b",
            r"\bemployment(\s+history)?\b",
            r"\bcareer\s+history\b",
            r"\bwork\s+history\b",
            r"\bprofessional\s+background\b",
        ],
        CVSectionType.EDUCATION: [
            r"\beducation(al)?\s*(background)?\b",
            r"\bacademic\s+(background|qualifications)\b",
            r"\bdegrees?\b",
            r"\bqualifications\b",
        ],
        CVSectionType.CERTIFICATIONS: [
            r"\bcertifications?\b",
            r"\bcredentials\b",
            r"\bprofessional\s+certifications?\b",
            r"\blicenses?\s*(&|and)?\s*certifications?\b",
            r"\baccreditations?\b",
        ],
        CVSectionType.PROJECTS: [
            r"\bprojects?\b",
            r"\bportfolio\b",
            r"\bachievements?\b",
            r"\bkey\s+projects?\b",
            r"\bselected\s+projects?\b",
            r"\bnotable\s+projects?\b",
        ],
        CVSectionType.CONTACT: [
            r"\bcontact(\s+information)?\b",
            r"\bpersonal\s+information\b",
            r"\bcontact\s+details\b",
        ],
    }

    # JD section header patterns
    JD_SECTION_PATTERNS = {
        JDSectionType.OVERVIEW: [
            r"\b(job\s+|role\s+)?overview\b",
            r"\b(job\s+|role\s+)?description\b",
            r"\babout\s+the\s+(role|position|job)\b",
            r"\bthe\s+role\b",
            r"\bposition\s+summary\b",
        ],
        JDSectionType.RESPONSIBILITIES: [
            r"\bresponsibilities\b",
            r"\bduties\b",
            r"\bwhat\s+you('ll| will)\s+do\b",
            r"\byour\s+role\b",
            r"\bkey\s+responsibilities\b",
            r"\bjob\s+duties\b",
            r"\bday\s+to\s+day\b",
        ],
        JDSectionType.REQUIREMENTS: [
            r"\brequirements?\b",
            r"\bmust\s+have\b",
            r"\brequired\s+(skills?|qualifications?|experience)\b",
            r"\bessential\s+(skills?|qualifications?|criteria)\b",
            r"\bwhat\s+you('ll)?\s+need\b",
            r"\bwhat\s+we('re)?\s+looking\s+for\b",
            r"\byou\s+should\s+have\b",
        ],
        JDSectionType.PREFERRED: [
            r"\bnice\s+to\s+have\b",
            r"\bpreferred\s*(skills?|qualifications?)?\b",
            r"\bbonus\s*(points?|skills?)?\b",
            r"\bdesirable\b",
            r"\bplus\s+points?\b",
            r"\badditional\s+(skills?|qualifications?)\b",
            r"\bideal(ly)?\b",
        ],
        JDSectionType.QUALIFICATIONS: [
            r"\bqualifications?\b",
            r"\beducation(al)?\s*(requirements?)?\b",
            r"\bexperience\s+required\b",
            r"\bminimum\s+qualifications?\b",
        ],
        JDSectionType.BENEFITS: [
            r"\bbenefits?\b",
            r"\bperks?\b",
            r"\bcompensation\b",
            r"\bwhat\s+we\s+offer\b",
            r"\bwhy\s+join\s+us\b",
        ],
        JDSectionType.ABOUT: [
            r"\babout\s+(us|the\s+company|our\s+company)\b",
            r"\bcompany\s+(overview|description|background)\b",
            r"\bwho\s+we\s+are\b",
            r"\bour\s+(mission|story|culture)\b",
        ],
    }

    def __init__(self):
        # Compile patterns for efficiency
        self._cv_compiled = {
            section_type: [re.compile(p, re.IGNORECASE) for p in patterns]
            for section_type, patterns in self.CV_SECTION_PATTERNS.items()
        }
        self._jd_compiled = {
            section_type: [re.compile(p, re.IGNORECASE) for p in patterns]
            for section_type, patterns in self.JD_SECTION_PATTERNS.items()
        }

    def _is_header_line(self, line: str) -> bool:
        """Check if a line looks like a section header."""
        stripped = line.strip()
        if not stripped:
            return False

        # Skip if too long (likely content, not header)
        if len(stripped) > 80:
            return False

        # Check various header indicators
        word_count = len(stripped.split())
        if word_count > 6:
            return False

        # All caps or title case
        if stripped.isupper():
            return True
        if stripped.istitle() and word_count <= 4:
            return True

        # Ends with colon
        if stripped.endswith(':'):
            return True

        # Starts with number/bullet but is short
        if re.match(r'^[\d\.\-\*\u2022]\s*', stripped) and word_count <= 3:
            return True

        # Contains typical section words
        section_indicators = ['summary', 'experience', 'education', 'skills',
                            'responsibilities', 'requirements', 'qualifications']
        if any(ind in stripped.lower() for ind in section_indicators):
            return True

        return False

    def _match_section_type(self, line: str, patterns: dict) -> Optional[Enum]:
        """Match a line against section patterns."""
        for section_type, compiled_patterns in patterns.items():
            for pattern in compiled_patterns:
                if pattern.search(line):
                    return section_type
        return None

    def detect_cv_sections(self, text: str) -> list[Section]:
        """Detect sections in a CV."""
        lines = text.split('\n')
        sections = []
        current_section = None
        current_content = []
        current_start = 0

        for i, line in enumerate(lines):
            if self._is_header_line(line):
                section_type = self._match_section_type(line, self._cv_compiled)

                # Only start a new section if we match a known section type
                # This prevents job titles and company names from fragmenting sections
                if section_type:
                    # Save previous section
                    if current_section is not None or current_content:
                        sections.append(Section(
                            section_type=current_section or CVSectionType.UNKNOWN,
                            title=lines[current_start].strip() if current_start < len(lines) else "",
                            content='\n'.join(current_content),
                            start_line=current_start,
                            end_line=i - 1
                        ))

                    # Start new section
                    current_section = section_type
                    current_content = []
                    current_start = i
                else:
                    # Header-like line but not a known section - keep as content
                    current_content.append(line)
            else:
                current_content.append(line)

        # Don't forget the last section
        if current_content or current_section:
            sections.append(Section(
                section_type=current_section or CVSectionType.UNKNOWN,
                title=lines[current_start].strip() if current_start < len(lines) else "",
                content='\n'.join(current_content),
                start_line=current_start,
                end_line=len(lines) - 1
            ))

        return sections

    def detect_jd_sections(self, text: str) -> list[Section]:
        """Detect sections in a job description."""
        lines = text.split('\n')
        sections = []
        current_section = None
        current_content = []
        current_start = 0

        for i, line in enumerate(lines):
            if self._is_header_line(line):
                section_type = self._match_section_type(line, self._jd_compiled)

                if section_type:
                    # Save previous section
                    if current_section is not None or current_content:
                        sections.append(Section(
                            section_type=current_section or JDSectionType.UNKNOWN,
                            title=lines[current_start].strip() if current_start < len(lines) else "",
                            content='\n'.join(current_content),
                            start_line=current_start,
                            end_line=i - 1
                        ))

                    # Start new section
                    current_section = section_type
                    current_content = []
                    current_start = i
                else:
                    current_content.append(line)
            else:
                current_content.append(line)

        # Don't forget the last section
        if current_content or current_section:
            sections.append(Section(
                section_type=current_section or JDSectionType.UNKNOWN,
                title=lines[current_start].strip() if current_start < len(lines) else "",
                content='\n'.join(current_content),
                start_line=current_start,
                end_line=len(lines) - 1
            ))

        return sections


# =============================================================================
# ENTITY EXTRACTOR
# =============================================================================

class EntityExtractor:
    """Rule-based entity extraction from taxonomy."""

    def __init__(self):
        # Pre-compile patterns for multi-word terms
        self._skill_patterns = {}
        for skill in HARD_SKILLS | SOFT_SKILLS:
            # Escape special regex chars and create word-boundary pattern
            escaped = re.escape(skill)
            self._skill_patterns[skill] = re.compile(rf'\b{escaped}\b', re.IGNORECASE)

        for cert in CERTIFICATIONS:
            escaped = re.escape(cert)
            self._skill_patterns[cert] = re.compile(rf'\b{escaped}\b', re.IGNORECASE)

        for method in METHODOLOGIES:
            escaped = re.escape(method)
            self._skill_patterns[method] = re.compile(rf'\b{escaped}\b', re.IGNORECASE)

        for domain in DOMAINS:
            escaped = re.escape(domain)
            self._skill_patterns[domain] = re.compile(rf'\b{escaped}\b', re.IGNORECASE)

        # Compile job title and experience patterns
        self._title_patterns = [re.compile(p, re.IGNORECASE) for p in JOB_TITLE_PATTERNS]
        self._exp_patterns = [re.compile(p, re.IGNORECASE) for p in YEARS_EXPERIENCE_PATTERNS]
        self._metric_patterns = [re.compile(p, re.IGNORECASE) for p in METRIC_PATTERNS]
        self._action_verb_pattern = re.compile(
            r'\b(' + '|'.join(ACTION_VERBS) + r')\b', re.IGNORECASE
        )

    def _get_context(self, text: str, match_start: int, match_end: int, window: int = 50) -> str:
        """Get surrounding context for a match."""
        start = max(0, match_start - window)
        end = min(len(text), match_end + window)
        return text[start:end]

    def _calculate_evidence_strength(self, text: str, section_type: Optional[Enum],
                                     match_start: int, match_end: int) -> float:
        """Calculate evidence strength based on context."""
        strength = 1.0
        context = self._get_context(text, match_start, match_end, window=100)

        # Section-based bonus
        if section_type:
            section_name = section_type.value if hasattr(section_type, 'value') else str(section_type)
            if section_name == 'experience':
                strength += 0.2  # Skills in experience are stronger evidence
            elif section_name == 'projects':
                strength += 0.15
            elif section_name == 'summary':
                strength += 0.1

        # Metric proximity bonus
        for pattern in self._metric_patterns:
            if pattern.search(context):
                strength += 0.2
                break

        # Action verb proximity bonus
        if self._action_verb_pattern.search(context):
            strength += 0.1

        return min(strength, 2.0)  # Cap at 2.0

    def extract_entities(self, text: str, section_type: Optional[Enum] = None) -> list[Entity]:
        """Extract all entities from text."""
        entities = []
        seen = set()  # Track (text_lower, entity_type) to avoid duplicates

        # Extract hard skills
        for skill in HARD_SKILLS:
            pattern = self._skill_patterns.get(skill)
            if pattern:
                for match in pattern.finditer(text):
                    key = (skill.lower(), EntityType.HARD_SKILL)
                    if key not in seen:
                        seen.add(key)
                        strength = self._calculate_evidence_strength(
                            text, section_type, match.start(), match.end()
                        )
                        entities.append(Entity(
                            text=match.group(),
                            entity_type=EntityType.HARD_SKILL,
                            section=section_type.value if section_type else None,
                            evidence_strength=strength,
                            context=self._get_context(text, match.start(), match.end())
                        ))

        # Extract soft skills
        for skill in SOFT_SKILLS:
            pattern = self._skill_patterns.get(skill)
            if pattern:
                for match in pattern.finditer(text):
                    key = (skill.lower(), EntityType.SOFT_SKILL)
                    if key not in seen:
                        seen.add(key)
                        strength = self._calculate_evidence_strength(
                            text, section_type, match.start(), match.end()
                        )
                        entities.append(Entity(
                            text=match.group(),
                            entity_type=EntityType.SOFT_SKILL,
                            section=section_type.value if section_type else None,
                            evidence_strength=strength,
                            context=self._get_context(text, match.start(), match.end())
                        ))

        # Extract certifications
        for cert in CERTIFICATIONS:
            pattern = self._skill_patterns.get(cert)
            if pattern:
                for match in pattern.finditer(text):
                    key = (cert.lower(), EntityType.CERTIFICATION)
                    if key not in seen:
                        seen.add(key)
                        entities.append(Entity(
                            text=match.group(),
                            entity_type=EntityType.CERTIFICATION,
                            section=section_type.value if section_type else None,
                            evidence_strength=1.5,  # Certifications are strong evidence
                            context=self._get_context(text, match.start(), match.end())
                        ))

        # Extract methodologies
        for method in METHODOLOGIES:
            pattern = self._skill_patterns.get(method)
            if pattern:
                for match in pattern.finditer(text):
                    key = (method.lower(), EntityType.METHODOLOGY)
                    if key not in seen:
                        seen.add(key)
                        entities.append(Entity(
                            text=match.group(),
                            entity_type=EntityType.METHODOLOGY,
                            section=section_type.value if section_type else None,
                            evidence_strength=1.0,
                            context=self._get_context(text, match.start(), match.end())
                        ))

        # Extract domains
        for domain in DOMAINS:
            pattern = self._skill_patterns.get(domain)
            if pattern:
                for match in pattern.finditer(text):
                    key = (domain.lower(), EntityType.DOMAIN)
                    if key not in seen:
                        seen.add(key)
                        entities.append(Entity(
                            text=match.group(),
                            entity_type=EntityType.DOMAIN,
                            section=section_type.value if section_type else None,
                            evidence_strength=1.0,
                            context=self._get_context(text, match.start(), match.end())
                        ))

        return entities

    def extract_job_titles(self, text: str) -> list[str]:
        """Extract job titles from text."""
        titles = []
        for pattern in self._title_patterns:
            for match in pattern.finditer(text):
                title = match.group().strip()
                if title.lower() not in [t.lower() for t in titles]:
                    titles.append(title)
        return titles

    def extract_years_experience(self, text: str) -> Optional[int]:
        """Extract years of experience from text."""
        max_years = None

        for pattern in self._exp_patterns:
            for match in pattern.finditer(text):
                groups = match.groups()
                for group in groups:
                    if group and group.isdigit():
                        years = int(group)
                        if max_years is None or years > max_years:
                            max_years = years

        return max_years


# =============================================================================
# DOCUMENT PARSER (Main entry point)
# =============================================================================

class DocumentParser:
    """Main entry point for document parsing."""

    def __init__(self):
        self.section_detector = SectionDetector()
        self.entity_extractor = EntityExtractor()

    def parse_cv(self, text: str) -> ParsedCV:
        """Parse a CV into structured format."""
        # Detect sections
        sections = self.section_detector.detect_cv_sections(text)

        # Extract entities from each section
        all_entities = []
        for section in sections:
            section_entities = self.entity_extractor.extract_entities(
                section.content, section.section_type
            )
            section.entities = section_entities
            all_entities.extend(section_entities)

        # Also extract from full text for any missed entities
        full_text_entities = self.entity_extractor.extract_entities(text)
        for entity in full_text_entities:
            if entity not in all_entities:
                all_entities.append(entity)

        # Extract job titles and years of experience
        job_titles = self.entity_extractor.extract_job_titles(text)
        years_exp = self.entity_extractor.extract_years_experience(text)

        return ParsedCV(
            raw_text=text,
            sections=sections,
            entities=all_entities,
            years_experience=years_exp,
            job_titles=job_titles
        )

    def parse_jd(self, text: str) -> ParsedJD:
        """Parse a job description into structured format."""
        # Detect sections
        sections = self.section_detector.detect_jd_sections(text)

        # Extract entities from each section
        all_entities = []
        required_entities = []
        preferred_entities = []

        for section in sections:
            section_entities = self.entity_extractor.extract_entities(
                section.content, section.section_type
            )
            section.entities = section_entities
            all_entities.extend(section_entities)

            # Classify as required or preferred based on section
            if section.section_type in (JDSectionType.REQUIREMENTS, JDSectionType.QUALIFICATIONS):
                required_entities.extend(section_entities)
            elif section.section_type == JDSectionType.PREFERRED:
                preferred_entities.extend(section_entities)

        # Also extract from full text
        full_text_entities = self.entity_extractor.extract_entities(text)
        for entity in full_text_entities:
            if entity not in all_entities:
                all_entities.append(entity)

        # Extract job title and years required
        job_titles = self.entity_extractor.extract_job_titles(text)
        years_req = self.entity_extractor.extract_years_experience(text)

        return ParsedJD(
            raw_text=text,
            sections=sections,
            entities=all_entities,
            required_entities=required_entities,
            preferred_entities=preferred_entities,
            years_required=years_req,
            job_title=job_titles[0] if job_titles else None
        )


# =============================================================================
# MAIN (for testing)
# =============================================================================

def main():
    """Test the document parser."""
    print("Document Parser Module")
    print("=" * 60)

    # Sample CV text for testing
    sample_cv = """
    JOHN DOE
    Senior Software Engineer
    john.doe@email.com | (555) 123-4567 | linkedin.com/in/johndoe

    PROFESSIONAL SUMMARY
    Experienced software engineer with 8+ years of experience in Python,
    JavaScript, and cloud technologies. Strong leadership skills and
    proven track record of delivering scalable solutions.

    CORE SKILLS
    Python, JavaScript, TypeScript, React, Node.js, AWS, Docker,
    Kubernetes, PostgreSQL, MongoDB, Agile, Scrum, CI/CD

    WORK EXPERIENCE

    Senior Software Engineer | Tech Corp | 2020 - Present
    - Led team of 5 engineers to deliver microservices platform
    - Reduced deployment time by 60% using CI/CD pipelines
    - Implemented machine learning features using TensorFlow

    Software Engineer | StartupXYZ | 2017 - 2020
    - Built REST APIs serving 1M+ daily requests
    - Developed React frontend with Redux state management
    - Achieved 99.9% uptime through monitoring and alerting

    EDUCATION
    BS Computer Science | State University | 2017

    CERTIFICATIONS
    AWS Certified Solutions Architect
    Certified Scrum Master (CSM)
    """

    parser = DocumentParser()

    print("\nParsing sample CV...")
    parsed = parser.parse_cv(sample_cv)

    print(f"\nSections detected: {len(parsed.sections)}")
    for section in parsed.sections:
        print(f"  - {section.section_type.value}: {section.title[:40]}...")

    print(f"\nEntities extracted: {len(parsed.entities)}")

    hard_skills = parsed.get_hard_skills()
    print(f"\nHard skills ({len(hard_skills)}): {', '.join(sorted(hard_skills)[:10])}...")

    soft_skills = parsed.get_soft_skills()
    print(f"Soft skills ({len(soft_skills)}): {', '.join(sorted(soft_skills))}")

    print(f"\nYears of experience: {parsed.years_experience}")
    print(f"Job titles: {parsed.job_titles}")

    print("\n" + "=" * 60)
    print("Parser ready for integration with ATSOptimizer")


if __name__ == "__main__":
    main()
