from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
import tempfile
import os
import time
import logging
from typing import Optional, List, Dict, Any

from app.core.database import get_db
from app.services.audio_processor import AudioProcessor
from app.services.verse_matcher import VerseMatcher
from app.services.arabic_matcher import ArabicMatcher
from app.models.verse import (
    IdentificationResponse,
    IdentificationRequest,
    TextIdentificationRequest,
    DatabaseStats,
    FeedbackRequest,
    VerseMatch
)

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/identify", response_model=IdentificationResponse)
async def identify_verse(
    request: Request,
    file: Optional[UploadFile] = File(None),
    transcript: Optional[str] = Form(None)
):
    """
    Identify a Quran verse using hybrid intelligence:
    - Live browser speech recognition transcript (if present)
    - Acoustic audio fingerprinting and DTW alignment (if audio file present)
    - Hybrid confidence fusion when both are provided
    """
    start_time = time.time()

    if not file and (not transcript or not transcript.strip()):
        raise HTTPException(
            status_code=400,
            detail="Either an audio file or an Arabic recitation transcript must be provided"
        )

    # Resolve services from app state
    audio_processor = getattr(request.app.state, "audio_processor", None) or AudioProcessor()
    verse_matcher = getattr(request.app.state, "verse_matcher", None) or VerseMatcher()
    arabic_matcher: ArabicMatcher = getattr(request.app.state, "arabic_matcher", None) or ArabicMatcher()

    text_matches: List[Dict[str, Any]] = []
    audio_matches: List[Dict[str, Any]] = []

    file_name = "transcript-query"
    file_size = 0
    content_type = "text/plain"
    temp_file_path = None

    try:
        # 1. Phonetic & Fuzzy Search on Speech Transcript
        if transcript and transcript.strip():
            logger.info(f"Processing recitation transcript: {transcript.strip()[:60]}...")
            text_matches = arabic_matcher.match_text(transcript.strip(), limit=5, min_confidence=0.35)

        # 2. Acoustic Processing on Uploaded Audio
        if file:
            file_name = file.filename or "audio.wav"
            content_type = file.content_type or "audio/wav"
            content = await file.read()
            file_size = len(content)

            if not content_type.startswith("audio/") and not file_name.lower().endswith((".wav", ".mp3", ".ogg", ".webm", ".m4a", ".flac")):
                raise HTTPException(
                    status_code=400,
                    detail="Uploaded file must be a valid audio recording"
                )

            suffix = os.path.splitext(file_name)[1] or ".wav"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                temp_file.write(content)
                temp_file_path = temp_file.name

            logger.info(f"Extracting acoustic fingerprint for: {file_name}")
            fingerprint = audio_processor.extract_fingerprint(temp_file_path)
            audio_matches = await verse_matcher.find_matches(fingerprint)

        # 3. Hybrid Fusion: Merge & Rank Candidates
        combined_dict: Dict[tuple, Dict[str, Any]] = {}

        # Add text matches
        for tm in text_matches:
            v = tm["verse"]
            key = (v["surah_number"], v["ayah_number"])
            combined_dict[key] = {
                "verse": v,
                "confidence": tm["confidence"],
                "similarity_score": tm["similarity_score"],
                "recognition_source": "speech_recognition"
            }

        # Add or merge audio matches
        for am in audio_matches:
            v = am["verse"]
            key = (v["surah_number"], v["ayah_number"])
            if key in combined_dict:
                # Hybrid Agreement: Both acoustic & speech recognition picked this verse!
                prev_conf = combined_dict[key]["confidence"]
                boosted_conf = min(round(max(prev_conf, am["confidence"]) + 0.15, 3), 1.0)
                combined_dict[key]["confidence"] = boosted_conf
                combined_dict[key]["similarity_score"] = round(max(prev_conf, am["similarity_score"]), 3)
                combined_dict[key]["recognition_source"] = "hybrid"
                logger.info(f"Hybrid match fusion on Surah {key[0]}:{key[1]} -> Boosted confidence to {boosted_conf}")
            else:
                combined_dict[key] = {
                    "verse": v,
                    "confidence": am["confidence"],
                    "similarity_score": am["similarity_score"],
                    "recognition_source": "acoustic_dtw"
                }

        # Sort combined matches by confidence descending
        sorted_matches = sorted(combined_dict.values(), key=lambda x: x["confidence"], reverse=True)[:5]
        processing_time = round(time.time() - start_time, 3)

        return IdentificationResponse(
            success=len(sorted_matches) > 0,
            matches=sorted_matches,
            file_info=IdentificationRequest(
                file_name=file_name,
                file_size=file_size,
                content_type=content_type
            ),
            processing_time=processing_time,
            message=f"Found {len(sorted_matches)} candidate verses" if sorted_matches else "No verses identified above confidence threshold"
        )

    except HTTPException:
        raise
    except Exception as e:
        processing_time = round(time.time() - start_time, 3)
        logger.error(f"Error during verse identification: {e}", exc_info=True)
        return IdentificationResponse(
            success=False,
            matches=[],
            file_info=IdentificationRequest(
                file_name=file_name,
                file_size=file_size,
                content_type=content_type
            ),
            processing_time=processing_time,
            message=f"Identification error: {str(e)}"
        )
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except Exception as e:
                logger.warning(f"Failed to delete temp file {temp_file_path}: {e}")

@router.post("/identify/text", response_model=IdentificationResponse)
async def identify_verse_by_text(payload: TextIdentificationRequest, request: Request):
    """Identify a Quran verse from recited text or speech transcript"""
    start_time = time.time()
    try:
        arabic_matcher: ArabicMatcher = getattr(request.app.state, "arabic_matcher", None) or ArabicMatcher()
        matches = arabic_matcher.match_text(payload.text, limit=payload.limit or 5, min_confidence=0.30)
        processing_time = round(time.time() - start_time, 3)

        return IdentificationResponse(
            success=len(matches) > 0,
            matches=matches,
            file_info=IdentificationRequest(
                file_name="text_query",
                file_size=len(payload.text.encode('utf-8')),
                content_type="text/plain"
            ),
            processing_time=processing_time,
            message=f"Found {len(matches)} matching verses"
        )
    except Exception as e:
        processing_time = round(time.time() - start_time, 3)
        logger.error(f"Error identifying verse by text: {e}")
        return IdentificationResponse(
            success=False,
            matches=[],
            file_info=IdentificationRequest(
                file_name="text_query",
                file_size=0,
                content_type="text/plain"
            ),
            processing_time=processing_time,
            message=f"Search error: {str(e)}"
        )

@router.get("/stats", response_model=DatabaseStats)
async def get_database_stats(db = Depends(get_db)):
    """Get database statistics"""
    try:
        stats = db.get_database_stats()
        return DatabaseStats(**stats)
    except Exception as e:
        logger.error(f"Error getting database stats: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving database statistics")

@router.get("/verses/{surah_number}/{ayah_number}")
async def get_verse(surah_number: int, ayah_number: int, db = Depends(get_db)):
    """Get a specific verse by surah and ayah number"""
    try:
        if surah_number < 1 or surah_number > 114:
            raise HTTPException(status_code=400, detail="Surah number must be between 1 and 114")

        if ayah_number < 1:
            raise HTTPException(status_code=400, detail="Ayah number must be positive")

        verse = db.get_verse(surah_number, ayah_number)

        if not verse:
            raise HTTPException(
                status_code=404,
                detail=f"Verse not found: Surah {surah_number}, Ayah {ayah_number}"
            )

        verse_dict = {
            "id": verse[0],
            "surah_number": verse[1],
            "ayah_number": verse[2],
            "arabic_text": verse[3],
            "english_translation": verse[4],
            "transliteration": verse[5],
            "fingerprint_data": verse[6],
            "created_at": str(verse[7]) if verse[7] else None,
            "updated_at": str(verse[8]) if verse[8] else None,
            "surah_name_arabic": verse[9] if len(verse) > 9 else None,
            "surah_name_english": verse[10] if len(verse) > 10 else None,
            "revelation_type": verse[11] if len(verse) > 11 else None
        }

        return JSONResponse(content=verse_dict)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting verse {surah_number}:{ayah_number}: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving verse")

@router.get("/surahs")
async def get_surahs(db = Depends(get_db)):
    """Get list of all surahs"""
    try:
        surahs = db.get_all_surahs()
        surahs_list = []

        for surah in surahs:
            surahs_list.append({
                "id": surah[0],
                "number": surah[1],
                "name_arabic": surah[2],
                "name_english": surah[3],
                "revelation_type": surah[4],
                "ayah_count": surah[5],
                "created_at": str(surah[6]) if surah[6] else None
            })

        return JSONResponse(content=surahs_list)

    except Exception as e:
        logger.error(f"Error getting surahs: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving surahs")

@router.get("/search")
async def search_verses(q: str, limit: int = 10, db = Depends(get_db)):
    """Search verses by text across Arabic, English translation, and transliteration"""
    try:
        if len(q.strip()) < 2:
            raise HTTPException(status_code=400, detail="Search query must be at least 2 characters")

        if limit < 1 or limit > 50:
            limit = 10

        results = db.search_verses(q.strip(), limit)
        verses_list = []

        for verse in results:
            verses_list.append({
                "id": verse[0],
                "surah_number": verse[1],
                "ayah_number": verse[2],
                "arabic_text": verse[3],
                "english_translation": verse[4],
                "transliteration": verse[5],
                "surah_name_arabic": verse[6] if len(verse) > 6 else None,
                "surah_name_english": verse[7] if len(verse) > 7 else None,
                "revelation_type": verse[8] if len(verse) > 8 else None
            })

        return JSONResponse(content={
            "query": q,
            "results": verses_list,
            "count": len(verses_list)
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching verses: {e}")
        raise HTTPException(status_code=500, detail="Error searching verses")

@router.post("/feedback")
async def submit_feedback(payload: FeedbackRequest, request: Request):
    """Submit feedback on verse identification accuracy"""
    try:
        verse_matcher = getattr(request.app.state, "verse_matcher", None) or VerseMatcher()
        await verse_matcher.update_matching_stats(payload.verse_id, payload.was_correct, payload.confidence)

        logger.info(f"Feedback received for verse {payload.verse_id}: {'correct' if payload.was_correct else 'incorrect'}")

        return JSONResponse(content={
            "message": "Feedback received successfully",
            "verse_id": payload.verse_id,
            "was_correct": payload.was_correct
        })

    except Exception as e:
        logger.error(f"Error processing feedback: {e}")
        raise HTTPException(status_code=500, detail="Error processing feedback")

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return JSONResponse(content={
        "status": "healthy",
        "service": "quran-verse-identifier-api",
        "timestamp": time.time()
    })

@router.get("/version")
async def get_version():
    """Get API version information"""
    return JSONResponse(content={
        "version": "1.0.0",
        "name": "Quran Verse Identifier API",
        "description": "API for identifying Quran verses from audio recordings and recitation transcripts"
    })