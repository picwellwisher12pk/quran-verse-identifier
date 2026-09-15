import json
import logging
import asyncio
from typing import List, Dict, Tuple, Optional, Any, Union
from concurrent.futures import ThreadPoolExecutor

from app.core.database import get_db
from app.services.audio_processor import AudioProcessor

logger = logging.getLogger(__name__)

class VerseMatcher:
    def __init__(self, min_confidence: float = 0.25, max_results: int = 5):
        self.min_confidence = min_confidence
        self.max_results = max_results
        self.audio_processor = AudioProcessor()
        self.db = get_db()
        self.executor = ThreadPoolExecutor(max_workers=4)
        self._parsed_cache: Dict[int, Dict[str, Any]] = {}
        logger.info(f"VerseMatcher initialized with min_confidence={min_confidence}, max_results={max_results}")

    def _get_parsed_fingerprint(self, verse_id: int, raw_fp: str) -> Dict[str, Any]:
        """Cache parsed fingerprint in memory to avoid repetitive json.loads."""
        if verse_id in self._parsed_cache:
            return self._parsed_cache[verse_id]
        parsed = self.audio_processor.parse_fingerprint_dict(raw_fp)
        self._parsed_cache[verse_id] = parsed
        return parsed

    async def find_matches(self, query_fingerprint: Union[str, Dict[str, Any]]) -> List[Dict]:
        """Find matching verses using two-tier filtering (Fast summary pre-filtering -> Detailed DTW)."""
        try:
            query_dict = self.audio_processor.parse_fingerprint_dict(query_fingerprint)
            query_features = query_dict.get('features', {})
            query_summary = query_features.get('summary_vector')

            # Fetch verses with fingerprints
            verses_with_fps = self.db.get_verses_with_fingerprints()
            if not verses_with_fps:
                logger.warning("No verses with fingerprints found in database")
                return []

            logger.info(f"Screening against {len(verses_with_fps)} fingerprinted verses")

            # --- TIER 1: Fast Summary Vector Ranking ---
            candidates = []
            for verse_row in verses_with_fps:
                verse_id = verse_row[0]
                stored_fp_raw = verse_row[5]
                stored_parsed = self._get_parsed_fingerprint(verse_id, stored_fp_raw)
                stored_summary = stored_parsed.get('features', {}).get('summary_vector')

                if query_summary and stored_summary:
                    score = self.audio_processor.compute_summary_similarity(query_summary, stored_summary)
                else:
                    score = 0.5  # fallback if summary missing

                candidates.append((score, verse_row, stored_parsed))

            # Sort by Tier-1 score and take top candidates (up to 25)
            candidates.sort(key=lambda x: x[0], reverse=True)
            top_candidates = candidates[:25]

            # --- TIER 2: Refined DTW on Top Candidates ---
            loop = asyncio.get_event_loop()
            tasks = [
                loop.run_in_executor(
                    self.executor,
                    self._evaluate_candidate_sync,
                    query_dict,
                    cand[1],
                    cand[2],
                    cand[0]
                )
                for cand in top_candidates
            ]

            results = await asyncio.gather(*tasks, return_exceptions=True)

            valid_matches = [
                res for res in results
                if isinstance(res, dict) and res.get('confidence', 0) >= self.min_confidence
            ]

            valid_matches.sort(key=lambda x: x['confidence'], reverse=True)
            final_matches = valid_matches[:self.max_results]
            logger.info(f"Found {len(final_matches)} matches above confidence threshold {self.min_confidence}")
            return final_matches

        except Exception as e:
            logger.error(f"Error finding matches: {e}", exc_info=True)
            return []

    def _evaluate_candidate_sync(self, query_dict: Dict[str, Any], verse_data: tuple,
                                stored_dict: Dict[str, Any], tier1_score: float) -> Optional[Dict]:
        """Synchronously evaluate a candidate verse with full feature comparison."""
        try:
            if len(verse_data) >= 12:
                verse_id, surah_number, ayah_number, arabic_text, english_translation, \
                stored_fingerprint, created_at, updated_at, transliteration, \
                surah_name_arabic, surah_name_english, revelation_type = verse_data
            else:
                verse_id, surah_number, ayah_number, arabic_text, english_translation, \
                stored_fingerprint, created_at, updated_at = verse_data[:8]
                transliteration, surah_name_arabic, surah_name_english, revelation_type = None, None, None, None

            similarity = self.audio_processor.compare_fingerprints(query_dict, stored_dict)

            # Combined confidence with slight boost if Tier 1 also aligned
            confidence = self._calculate_confidence_score(similarity, tier1_score)

            def format_timestamp(ts):
                if not ts:
                    return None
                if hasattr(ts, 'isoformat'):
                    return ts.isoformat()
                return str(ts)

            return {
                'verse': {
                    'id': verse_id,
                    'surah_number': surah_number,
                    'ayah_number': ayah_number,
                    'arabic_text': arabic_text,
                    'english_translation': english_translation or "",
                    'transliteration': transliteration or "",
                    'surah_name_arabic': surah_name_arabic or "",
                    'surah_name_english': surah_name_english or "",
                    'revelation_type': revelation_type or "",
                    'fingerprint_data': stored_fingerprint,
                    'created_at': format_timestamp(created_at),
                    'updated_at': format_timestamp(updated_at)
                },
                'confidence': confidence,
                'similarity_score': similarity,
                'recognition_source': 'acoustic_dtw'
            }

        except Exception as e:
            logger.error(f"Error evaluating candidate verse {verse_data[0]}: {e}")
            return None

    def _calculate_confidence_score(self, similarity: float, tier1_score: float) -> float:
        """Calculate confidence score combining detailed similarity and fast summary agreement."""
        try:
            # Weighted combination: detailed comparison dominates (75%), summary reinforces (25%)
            blended = (similarity * 0.75) + (tier1_score * 0.25)

            if blended > 0.85:
                confidence = min(blended * 1.05, 1.0)
            elif blended < 0.4:
                confidence = blended * 0.9
            else:
                confidence = blended

            return float(max(0.0, min(1.0, confidence)))
        except Exception:
            return float(similarity)

    async def update_matching_stats(self, verse_id: int, was_correct: bool, confidence: float):
        """Update matching feedback stats."""
        try:
            status = "correct" if was_correct else "incorrect"
            logger.info(f"Feedback received for verse {verse_id}: {status}, confidence: {confidence:.3f}")
        except Exception as e:
            logger.error(f"Error updating stats: {e}")

    async def cleanup(self):
        """Cleanup thread executor."""
        try:
            if hasattr(self, 'executor'):
                self.executor.shutdown(wait=False)
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")