from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class VerseBase(BaseModel):
    surah_number: int = Field(..., ge=1, le=114, description="Surah number (1-114)")
    ayah_number: int = Field(..., ge=1, description="Ayah number within surah")
    arabic_text: str = Field(..., description="Arabic text of the verse")
    english_translation: Optional[str] = Field(None, description="English translation")
    transliteration: Optional[str] = Field(None, description="English phonetic transliteration")
    urdu_translation: Optional[str] = Field(None, description="Urdu translation")
    surah_name_arabic: Optional[str] = Field(None, description="Arabic name of the surah")
    surah_name_english: Optional[str] = Field(None, description="English name of the surah")
    revelation_type: Optional[str] = Field(None, description="Meccan or Medinan revelation")

class VerseCreate(VerseBase):
    fingerprint_data: str = Field(..., description="Audio fingerprint data")

class Verse(VerseBase):
    id: int = Field(..., description="Unique verse ID")
    fingerprint_data: Optional[str] = Field(None, description="Audio fingerprint data")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "surah_number": 1,
                "ayah_number": 1,
                "arabic_text": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
                "english_translation": "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
                "transliteration": "Bismillaahir Rahmaanir Raheem",
                "urdu_translation": "شروع الله کا نام لے کر جو بڑا مہربان نہایت رحم والا ہے",
                "surah_name_arabic": "الفاتحة",
                "surah_name_english": "Al-Fatihah",
                "revelation_type": "Meccan",
                "fingerprint_data": "...",
                "created_at": "2023-01-01T00:00:00",
                "updated_at": "2023-01-01T00:00:00"
            }
        }

class VerseMatch(BaseModel):
    verse: Verse
    confidence: float = Field(..., ge=0.0, le=1.0, description="Match confidence score")
    similarity_score: float = Field(..., ge=0.0, le=1.0, description="Fingerprint or phonetic similarity score")
    recognition_source: Optional[str] = Field("acoustic", description="Recognition source (acoustic, speech_recognition, hybrid)")

class IdentificationRequest(BaseModel):
    file_name: str = Field(..., description="Original file name")
    file_size: int = Field(..., ge=0, description="File size in bytes")
    content_type: str = Field(..., description="MIME type of the audio file")

class TextIdentificationRequest(BaseModel):
    text: str = Field(..., description="Arabic recited text or speech transcript")
    limit: Optional[int] = Field(5, ge=1, le=20, description="Max matches to return")

class IdentificationResponse(BaseModel):
    success: bool = Field(..., description="Whether identification was successful")
    matches: List[VerseMatch] = Field(default=[], description="List of matching verses")
    file_info: IdentificationRequest = Field(..., description="Information about the uploaded file")
    processing_time: Optional[float] = Field(None, description="Time taken to process in seconds")
    message: Optional[str] = Field(None, description="Additional message or error details")

class SurahInfo(BaseModel):
    number: int = Field(..., ge=1, le=114, description="Surah number")
    name_arabic: str = Field(..., description="Arabic name")
    name_english: str = Field(..., description="English name")
    revelation_type: str = Field(..., description="Meccan or Medinan")
    ayah_count: int = Field(..., ge=1, description="Number of ayahs in this surah")

class DatabaseStats(BaseModel):
    total_verses: int = Field(..., description="Total number of verses in database")
    total_surahs: int = Field(..., description="Total number of surahs")
    verses_with_audio: int = Field(..., description="Number of verses with audio fingerprints")
    last_updated: Optional[datetime] = Field(None, description="Last database update timestamp")

class FeedbackRequest(BaseModel):
    verse_id: int = Field(..., description="ID of the verse")
    was_correct: bool = Field(..., description="Whether the identification was correct")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence of the match")
    user_comment: Optional[str] = Field(None, max_length=500, description="Optional feedback comment")