#!/usr/bin/env python3
"""
Semantic Scorer Module (Track 2.8.2)
Provides semantic similarity scoring using sentence-transformers embeddings.
Enables matching skills by meaning, not just exact keywords.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional, Any
from functools import lru_cache

# Optional dependencies - graceful degradation if not available
try:
    import numpy as np
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    np = None  # type: ignore
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    SentenceTransformer = None

from document_parser import ParsedCV, ParsedJD, CVSectionType, JDSectionType


logger = logging.getLogger(__name__)


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class SemanticMatch:
    """Represents a semantic match between JD and CV sections."""
    jd_section: str
    cv_section: str
    similarity: float
    jd_text_preview: str = ""
    cv_text_preview: str = ""
    is_high_value: bool = False  # Experience/Projects matches are high-value


@dataclass
class SemanticScoreResult:
    """Result of semantic scoring analysis."""
    score: float  # 0-100
    section_similarities: dict[str, float] = field(default_factory=dict)
    top_matches: list[SemanticMatch] = field(default_factory=list)
    gaps: list[str] = field(default_factory=list)
    entity_support_ratio: float = 0.0
    high_value_match_count: int = 0
    available: bool = True


# =============================================================================
# EMBEDDING CACHE
# =============================================================================

class EmbeddingCache:
    """LRU cache for text embeddings to avoid recomputation."""

    def __init__(self, maxsize: int = 1000):
        self.maxsize = maxsize
        self._cache: dict[str, Any] = {}
        self._access_order: list[str] = []

    def get(self, text: str) -> Optional[Any]:
        """Get cached embedding if available."""
        normalized = text.strip().lower()
        if normalized in self._cache:
            # Move to end (most recently used)
            if normalized in self._access_order:
                self._access_order.remove(normalized)
            self._access_order.append(normalized)
            return self._cache[normalized]
        return None

    def put(self, text: str, embedding: Any) -> None:
        """Cache an embedding."""
        normalized = text.strip().lower()

        # Evict oldest if at capacity
        while len(self._cache) >= self.maxsize and self._access_order:
            oldest = self._access_order.pop(0)
            self._cache.pop(oldest, None)

        self._cache[normalized] = embedding
        self._access_order.append(normalized)

    def clear(self) -> None:
        """Clear the cache."""
        self._cache.clear()
        self._access_order.clear()

    def __len__(self) -> int:
        return len(self._cache)


# =============================================================================
# SEMANTIC SCORER
# =============================================================================

class SemanticScorer:
    """
    Semantic similarity scorer using sentence-transformers.
    Uses all-MiniLM-L6-v2 model (384 dimensions, fast, CPU-friendly).
    """

    # Section mapping: JD section -> relevant CV sections
    # Extended to cover more JD section types commonly detected
    SECTION_MAPPING = {
        JDSectionType.REQUIREMENTS: [CVSectionType.SKILLS, CVSectionType.EXPERIENCE],
        JDSectionType.RESPONSIBILITIES: [CVSectionType.EXPERIENCE, CVSectionType.PROJECTS],
        JDSectionType.PREFERRED: [CVSectionType.SKILLS, CVSectionType.PROJECTS],
        JDSectionType.QUALIFICATIONS: [CVSectionType.SKILLS, CVSectionType.EXPERIENCE, CVSectionType.EDUCATION, CVSectionType.CERTIFICATIONS],
        JDSectionType.OVERVIEW: [CVSectionType.SUMMARY, CVSectionType.EXPERIENCE, CVSectionType.SKILLS],
        JDSectionType.ABOUT: [CVSectionType.SUMMARY],
    }

    # High-value CV sections (demonstrate real experience)
    HIGH_VALUE_SECTIONS = {CVSectionType.EXPERIENCE, CVSectionType.PROJECTS}

    MODEL_NAME = "all-MiniLM-L6-v2"
    EMBEDDING_DIM = 384

    def __init__(self, cache_size: int = 1000):
        """Initialize the semantic scorer with lazy model loading."""
        self._model = None
        self._cache = EmbeddingCache(maxsize=cache_size)
        self._model_loaded = False

    @classmethod
    def is_available(cls) -> bool:
        """Check if sentence-transformers is available."""
        return SENTENCE_TRANSFORMERS_AVAILABLE

    def _load_model(self) -> bool:
        """Lazy load the model on first use."""
        if self._model_loaded:
            return self._model is not None

        self._model_loaded = True

        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            logger.warning("sentence-transformers not installed. Semantic scoring unavailable.")
            return False

        try:
            logger.info(f"Loading embedding model: {self.MODEL_NAME}")
            self._model = SentenceTransformer(self.MODEL_NAME)
            logger.info("Embedding model loaded successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            self._model = None
            return False

    def embed_text(self, text: str) -> Optional[Any]:
        """
        Embed a text string into a vector.
        Uses cache to avoid recomputation.
        """
        if not self._load_model():
            return None

        # Check cache first
        cached = self._cache.get(text)
        if cached is not None:
            return cached

        # Generate embedding
        try:
            embedding = self._model.encode(text, convert_to_numpy=True)
            self._cache.put(text, embedding)
            return embedding
        except Exception as e:
            logger.error(f"Error embedding text: {e}")
            return None

    def embed_batch(self, texts: list[str]) -> list[Optional[Any]]:
        """
        Embed multiple texts, using cache where available.
        """
        if not self._load_model():
            return [None] * len(texts)

        results = []
        uncached_texts = []
        uncached_indices = []

        # Check cache for each text
        for i, text in enumerate(texts):
            cached = self._cache.get(text)
            if cached is not None:
                results.append(cached)
            else:
                results.append(None)
                uncached_texts.append(text)
                uncached_indices.append(i)

        # Batch encode uncached texts
        if uncached_texts:
            try:
                embeddings = self._model.encode(uncached_texts, convert_to_numpy=True)
                for i, (text, embedding) in enumerate(zip(uncached_texts, embeddings)):
                    idx = uncached_indices[i]
                    results[idx] = embedding
                    self._cache.put(text, embedding)
            except Exception as e:
                logger.error(f"Error batch embedding texts: {e}")

        return results

    @staticmethod
    def cosine_similarity(a: Any, b: Any) -> float:
        """Calculate cosine similarity between two vectors."""
        if a is None or b is None:
            return 0.0

        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return float(np.dot(a, b) / (norm_a * norm_b))

    def _get_section_text(self, sections: list, section_type) -> str:
        """Get combined text from sections of a given type."""
        texts = []
        for section in sections:
            if section.section_type == section_type:
                texts.append(section.content)
        return " ".join(texts).strip()

    def _truncate_text(self, text: str, max_len: int = 50) -> str:
        """Truncate text for preview."""
        if len(text) <= max_len:
            return text
        return text[:max_len-3] + "..."

    def match_sections(self, parsed_cv: ParsedCV, parsed_jd: ParsedJD) -> list[SemanticMatch]:
        """
        Match JD sections to CV sections semantically.
        Returns a list of matches sorted by similarity (highest first).
        """
        matches = []

        for jd_section_type, cv_section_types in self.SECTION_MAPPING.items():
            # Get JD section text
            jd_text = self._get_section_text(parsed_jd.sections, jd_section_type)
            if not jd_text or len(jd_text.strip()) < 20:
                continue

            jd_embedding = self.embed_text(jd_text)
            if jd_embedding is None:
                continue

            for cv_section_type in cv_section_types:
                cv_text = self._get_section_text(parsed_cv.sections, cv_section_type)
                if not cv_text or len(cv_text.strip()) < 20:
                    continue

                cv_embedding = self.embed_text(cv_text)
                if cv_embedding is None:
                    continue

                similarity = self.cosine_similarity(jd_embedding, cv_embedding)
                is_high_value = cv_section_type in self.HIGH_VALUE_SECTIONS

                matches.append(SemanticMatch(
                    jd_section=jd_section_type.value,
                    cv_section=cv_section_type.value,
                    similarity=round(similarity * 100, 1),
                    jd_text_preview=self._truncate_text(jd_text),
                    cv_text_preview=self._truncate_text(cv_text),
                    is_high_value=is_high_value
                ))

        # Sort by similarity (highest first)
        matches.sort(key=lambda m: m.similarity, reverse=True)
        return matches

    def _count_hard_entities(self, parsed: ParsedCV | ParsedJD) -> int:
        """Count hard entities (skills, certifications) in a parsed document."""
        from document_parser import EntityType
        count = 0
        for entity in parsed.entities:
            if entity.entity_type in (EntityType.HARD_SKILL, EntityType.CERTIFICATION):
                count += 1
        return count

    def _apply_safety_rails(
        self,
        raw_score: float,
        matches: list[SemanticMatch],
        parsed_cv: ParsedCV,
        parsed_jd: ParsedJD
    ) -> tuple[float, list[str]]:
        """
        Apply safety rails to prevent over-matching on vague text.
        Returns adjusted score and list of reasons for adjustment.
        """
        adjusted_score = raw_score
        gaps = []

        # Safety Rail 1: Penalize high semantic scores with few hard entities
        cv_entities = self._count_hard_entities(parsed_cv)
        jd_entities = self._count_hard_entities(parsed_jd)

        if jd_entities > 0:
            entity_ratio = cv_entities / jd_entities
        else:
            entity_ratio = 1.0 if cv_entities > 0 else 0.5

        if raw_score > 70 and entity_ratio < 0.3:
            penalty = (raw_score - 70) * 0.5
            adjusted_score -= penalty
            gaps.append(f"Low entity coverage ({cv_entities} vs {jd_entities} JD skills)")

        # Safety Rail 2: Cap score if no high-value section matches
        high_value_matches = [m for m in matches if m.is_high_value and m.similarity > 50]

        if not high_value_matches and adjusted_score > 60:
            adjusted_score = min(adjusted_score, 60)
            gaps.append("No strong Experience/Projects matches")

        # Safety Rail 3: Reduce score if very few matches overall
        if len(matches) < 2 and adjusted_score > 50:
            adjusted_score = min(adjusted_score, 50)
            gaps.append("Limited section coverage")

        return max(0, min(100, adjusted_score)), gaps

    def calculate_semantic_score(
        self,
        parsed_cv: ParsedCV,
        parsed_jd: ParsedJD
    ) -> SemanticScoreResult:
        """
        Calculate the semantic similarity score between CV and JD.
        Main entry point for semantic scoring.
        """
        # Check availability
        if not self.is_available():
            return SemanticScoreResult(
                score=0.0,
                available=False,
                gaps=[]
            )

        if not self._load_model():
            return SemanticScoreResult(
                score=0.0,
                available=False,
                gaps=[]
            )

        # Match sections
        matches = self.match_sections(parsed_cv, parsed_jd)

        if not matches:
            return SemanticScoreResult(
                score=0.0,
                available=True,
                gaps=["No matchable sections found"]
            )

        # Calculate raw score from matches
        # Weight high-value matches more
        total_weight = 0.0
        weighted_sum = 0.0

        section_similarities = {}
        high_value_count = 0

        for match in matches:
            weight = 1.5 if match.is_high_value else 1.0
            weighted_sum += match.similarity * weight
            total_weight += weight

            # Track best similarity per JD section
            if match.jd_section not in section_similarities:
                section_similarities[match.jd_section] = match.similarity
            else:
                section_similarities[match.jd_section] = max(
                    section_similarities[match.jd_section],
                    match.similarity
                )

            if match.is_high_value and match.similarity > 50:
                high_value_count += 1

        raw_score = weighted_sum / total_weight if total_weight > 0 else 0.0

        # Apply safety rails
        final_score, gaps = self._apply_safety_rails(raw_score, matches, parsed_cv, parsed_jd)

        # Calculate entity support ratio
        cv_entities = self._count_hard_entities(parsed_cv)
        jd_entities = self._count_hard_entities(parsed_jd)
        entity_ratio = cv_entities / jd_entities if jd_entities > 0 else 0.0

        return SemanticScoreResult(
            score=round(final_score, 1),
            section_similarities=section_similarities,
            top_matches=matches[:5],
            gaps=gaps,
            entity_support_ratio=round(entity_ratio, 2),
            high_value_match_count=high_value_count,
            available=True
        )


# =============================================================================
# MAIN (for testing)
# =============================================================================

def main():
    """Test the semantic scorer."""
    print("Semantic Scorer Module (Track 2.8.2)")
    print("=" * 60)

    # Check availability
    print(f"\nsentence-transformers available: {SemanticScorer.is_available()}")

    if not SemanticScorer.is_available():
        print("\nTo enable semantic scoring, install sentence-transformers:")
        print("  pip install sentence-transformers>=2.2.0")
        return

    scorer = SemanticScorer()

    # Test embedding
    print("\nTesting embeddings...")
    text1 = "Python programming and machine learning"
    text2 = "Data science with Python and ML"
    text3 = "Cooking recipes and gardening tips"

    emb1 = scorer.embed_text(text1)
    emb2 = scorer.embed_text(text2)
    emb3 = scorer.embed_text(text3)

    if emb1 is not None:
        print(f"Embedding shape: {emb1.shape}")
        print(f"\nSimilarity (similar texts): {scorer.cosine_similarity(emb1, emb2):.3f}")
        print(f"Similarity (unrelated texts): {scorer.cosine_similarity(emb1, emb3):.3f}")

    # Test caching
    print(f"\nCache size after embeddings: {len(scorer._cache)}")

    # Re-embed same text (should use cache)
    emb1_cached = scorer.embed_text(text1)
    print(f"Cache hit verified: {np.array_equal(emb1, emb1_cached)}")

    print("\n" + "=" * 60)
    print("Semantic scorer ready for integration with ATSOptimizer")


if __name__ == "__main__":
    main()
