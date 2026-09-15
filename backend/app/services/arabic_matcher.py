import re
import logging
from typing import List, Dict, Any, Optional
from rapidfuzz import fuzz

from app.core.database import get_db

logger = logging.getLogger(__name__)

def normalize_arabic(text: str) -> str:
    """
    Normalize Arabic text by removing diacritics, Quranic symbols,
    and standardizing character forms for robust phonetic and fuzzy matching.
    """
    if not text:
        return ""

    # Remove harakat / tashkeel & Quranic annotations
    text = re.sub(r'[\u0617-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]', '', text)

    # Normalize Alef forms (إ, أ, آ, ٱ) -> ا
    text = re.sub(r'[إأآٱ]', 'ا', text)

    # Normalize Taa Marbuta (ة) -> ه
    text = re.sub(r'ة', 'ه', text)

    # Normalize Yaa / Alif Maqsura (ى) -> ي
    text = re.sub(r'ى', 'ي', text)

    # Remove Tatweel (ـ)
    text = re.sub(r'ـ', '', text)

    # Remove punctuation, brackets, numbers, and extra symbols
    text = re.sub(r'[^\w\s]', '', text)

    # Collapse multiple whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

class ArabicMatcher:
    """
    High-performance Arabic fuzzy matcher for the Quran.
    Matches live speech transcripts, phonetic queries, or user input
    against all 6,236 Quran verses in milliseconds.
    """
    def __init__(self):
        self.db = get_db()
        self._corpus: List[Dict[str, Any]] = []
        self._corpus_texts: List[str] = []
        self._is_initialized = False

    def initialize(self):
        """Preload and normalize all 6,236 Quran verses into memory."""
        if self._is_initialized and self._corpus:
            return

        try:
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT v.id, v.surah_number, v.ayah_number, v.arabic_text,
                           v.english_translation, v.transliteration, v.fingerprint_data,
                           s.name_arabic, s.name_english, s.revelation_type
                    FROM verses v
                    JOIN surahs s ON v.surah_number = s.number
                    ORDER BY v.surah_number, v.ayah_number
                """)
                rows = cursor.fetchall()

            self._corpus = []
            self._corpus_texts = []

            for r in rows:
                norm_text = normalize_arabic(r[3])
                entry = {
                    "id": r[0],
                    "surah_number": r[1],
                    "ayah_number": r[2],
                    "arabic_text": r[3],
                    "english_translation": r[4] or "",
                    "transliteration": r[5] or "",
                    "fingerprint_data": r[6] or "",
                    "surah_name_arabic": r[7] or "",
                    "surah_name_english": r[8] or "",
                    "revelation_type": r[9] or "",
                    "normalized_text": norm_text
                }
                self._corpus.append(entry)
                self._corpus_texts.append(norm_text)

            self._is_initialized = True
            logger.info(f"ArabicMatcher initialized with {len(self._corpus)} verses in memory")
        except Exception as e:
            logger.error(f"Failed to initialize ArabicMatcher corpus: {e}")

    def match_text(self, query: str, limit: int = 5, min_confidence: float = 0.35) -> List[Dict[str, Any]]:
        """
        Find best matching Quran verses for an Arabic query string.
        Combines exact substring containment, RapidFuzz token_set_ratio,
        and WRatio to achieve optimal ranking for spoken phrases.
        """
        if not self._is_initialized or not self._corpus:
            self.initialize()

        if not query or not query.strip():
            return []

        norm_query = normalize_arabic(query.strip())
        if not norm_query or len(norm_query) < 2:
            return []

        scored_candidates = []

        for entry in self._corpus:
            target = entry["normalized_text"]
            if not target:
                continue

            score = 0.0

            if norm_query == target:
                score = 100.0
            elif norm_query in target:
                coverage = len(norm_query) / len(target)
                score = 85.0 + (coverage * 15.0)
            elif target in norm_query:
                coverage = len(target) / len(norm_query)
                score = 85.0 + (coverage * 15.0)
            else:
                token_score = fuzz.token_set_ratio(norm_query, target)
                if token_score > 50:
                    partial = fuzz.partial_ratio(norm_query, target)
                    ratio = fuzz.ratio(norm_query, target)
                    score = (token_score * 0.5) + (partial * 0.3) + (ratio * 0.2)
                else:
                    score = token_score * 0.8

            confidence = round(min(score / 100.0, 1.0), 3)
            if confidence >= min_confidence:
                scored_candidates.append({
                    "verse": {
                        "id": entry["id"],
                        "surah_number": entry["surah_number"],
                        "ayah_number": entry["ayah_number"],
                        "arabic_text": entry["arabic_text"],
                        "english_translation": entry["english_translation"],
                        "transliteration": entry["transliteration"],
                        "fingerprint_data": entry["fingerprint_data"],
                        "surah_name_arabic": entry["surah_name_arabic"],
                        "surah_name_english": entry["surah_name_english"],
                        "revelation_type": entry["revelation_type"]
                    },
                    "confidence": confidence,
                    "similarity_score": confidence,
                    "recognition_source": "speech_recognition"
                })

        scored_candidates.sort(key=lambda x: x["confidence"], reverse=True)
        return scored_candidates[:limit]