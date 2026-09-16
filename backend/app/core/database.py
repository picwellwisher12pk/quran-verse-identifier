import os
import sqlite3
import logging
from datetime import datetime
from typing import List, Optional
import json

logger = logging.getLogger(__name__)

DATABASE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "quran.db")

class DatabaseManager:
    def __init__(self, db_path: str = DATABASE_PATH):
        self.db_path = db_path
        self.ensure_data_directory()

    def ensure_data_directory(self):
        """Ensure the data directory exists"""
        data_dir = os.path.dirname(self.db_path)
        os.makedirs(data_dir, exist_ok=True)

    def get_connection(self):
        """Get a database connection"""
        return sqlite3.connect(self.db_path)

    def init_database(self):
        """Initialize the database with required tables"""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Create surahs table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS surahs (
                    id INTEGER PRIMARY KEY,
                    number INTEGER UNIQUE NOT NULL,
                    name_arabic TEXT NOT NULL,
                    name_english TEXT NOT NULL,
                    revelation_type TEXT NOT NULL,
                    ayah_count INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Create verses table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS verses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    surah_number INTEGER NOT NULL,
                    ayah_number INTEGER NOT NULL,
                    arabic_text TEXT NOT NULL,
                    english_translation TEXT,
                    transliteration TEXT,
                    fingerprint_data TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (surah_number) REFERENCES surahs (number),
                    UNIQUE(surah_number, ayah_number)
                )
            """)

            # Ensure transliteration and urdu_translation columns exist for existing DBs
            cursor.execute("PRAGMA table_info(verses)")
            columns = [col[1] for col in cursor.fetchall()]
            if "transliteration" not in columns:
                cursor.execute("ALTER TABLE verses ADD COLUMN transliteration TEXT")
            if "urdu_translation" not in columns:
                cursor.execute("ALTER TABLE verses ADD COLUMN urdu_translation TEXT")

            # Create indexes for faster queries
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_verses_surah ON verses(surah_number)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_verses_ayah ON verses(ayah_number)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_verses_fingerprint ON verses(fingerprint_data)")

            conn.commit()
            logger.info("Database initialized successfully")

    def insert_verse(self, surah_number: int, ayah_number: int, arabic_text: str,
                    english_translation: str = None, transliteration: str = None,
                    urdu_translation: str = None, fingerprint_data: str = None):
        """Insert or update a verse while preserving existing fingerprint data"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.utcnow().isoformat()

            cursor.execute("""
                INSERT INTO verses
                (surah_number, ayah_number, arabic_text, english_translation, transliteration, urdu_translation, fingerprint_data, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(surah_number, ayah_number) DO UPDATE SET
                    arabic_text = excluded.arabic_text,
                    english_translation = COALESCE(excluded.english_translation, verses.english_translation),
                    transliteration = COALESCE(excluded.transliteration, verses.transliteration),
                    urdu_translation = COALESCE(excluded.urdu_translation, verses.urdu_translation),
                    fingerprint_data = COALESCE(excluded.fingerprint_data, verses.fingerprint_data),
                    updated_at = excluded.updated_at
            """, (surah_number, ayah_number, arabic_text, english_translation, transliteration, urdu_translation, fingerprint_data, now))

            conn.commit()
            return cursor.lastrowid

    def insert_verses_batch(self, verses_data: List[dict]):
        """Batch insert verses while preserving existing fingerprints"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.utcnow().isoformat()

            params = [
                (
                    v['surah_number'],
                    v['ayah_number'],
                    v['arabic_text'],
                    v.get('english_translation'),
                    v.get('transliteration'),
                    v.get('urdu_translation'),
                    v.get('fingerprint_data'),
                    now
                )
                for v in verses_data
            ]

            cursor.executemany("""
                INSERT INTO verses
                (surah_number, ayah_number, arabic_text, english_translation, transliteration, urdu_translation, fingerprint_data, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(surah_number, ayah_number) DO UPDATE SET
                    arabic_text = excluded.arabic_text,
                    english_translation = COALESCE(excluded.english_translation, verses.english_translation),
                    transliteration = COALESCE(excluded.transliteration, verses.transliteration),
                    urdu_translation = COALESCE(excluded.urdu_translation, verses.urdu_translation),
                    fingerprint_data = COALESCE(excluded.fingerprint_data, verses.fingerprint_data),
                    updated_at = excluded.updated_at
            """, params)

            conn.commit()
            return len(params)

    def get_verse(self, surah_number: int, ayah_number: int):
        """Get a specific verse joined with surah metadata"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT v.id, v.surah_number, v.ayah_number, v.arabic_text,
                       v.english_translation, v.transliteration, v.urdu_translation, v.fingerprint_data,
                       v.created_at, v.updated_at,
                       s.name_arabic, s.name_english, s.revelation_type
                FROM verses v
                JOIN surahs s ON v.surah_number = s.number
                WHERE v.surah_number = ? AND v.ayah_number = ?
            """, (surah_number, ayah_number))
            return cursor.fetchone()

    def get_verses_with_fingerprints(self) -> List[tuple]:
        """Get all verses that have fingerprint data along with surah metadata"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT v.id, v.surah_number, v.ayah_number, v.arabic_text, 
                       v.english_translation, v.urdu_translation, v.fingerprint_data,
                       v.created_at, v.updated_at, v.transliteration,
                       s.name_arabic, s.name_english, s.revelation_type
                FROM verses v
                JOIN surahs s ON v.surah_number = s.number
                WHERE v.fingerprint_data IS NOT NULL
            """)
            return cursor.fetchall()

    def update_verse_fingerprint(self, verse_id: int, fingerprint_data: str):
        """Update fingerprint data for a verse"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.utcnow().isoformat()

            cursor.execute("""
                UPDATE verses SET fingerprint_data = ?, updated_at = ?
                WHERE id = ?
            """, (fingerprint_data, now, verse_id))

            conn.commit()
            return cursor.rowcount > 0

    def get_database_stats(self):
        """Get database statistics"""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Total verses
            cursor.execute("SELECT COUNT(*) FROM verses")
            total_verses = cursor.fetchone()[0]

            # Total surahs
            cursor.execute("SELECT COUNT(*) FROM surahs")
            total_surahs = cursor.fetchone()[0]

            # Verses with audio fingerprints
            cursor.execute("SELECT COUNT(*) FROM verses WHERE fingerprint_data IS NOT NULL")
            verses_with_audio = cursor.fetchone()[0]

            # Last updated
            cursor.execute("SELECT MAX(updated_at) FROM verses")
            last_updated = cursor.fetchone()[0]

            return {
                "total_verses": total_verses,
                "total_surahs": total_surahs,
                "verses_with_audio": verses_with_audio,
                "last_updated": last_updated
            }

    def insert_surah(self, number: int, name_arabic: str, name_english: str,
                    revelation_type: str, ayah_count: int):
        """Insert a new surah into the database"""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                INSERT OR REPLACE INTO surahs
                (number, name_arabic, name_english, revelation_type, ayah_count)
                VALUES (?, ?, ?, ?, ?)
            """, (number, name_arabic, name_english, revelation_type, ayah_count))

            conn.commit()
            return cursor.lastrowid

    def get_all_surahs(self):
        """Get all surahs"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM surahs ORDER BY number")
            return cursor.fetchall()

    def search_verses(self, query: str, limit: int = 10) -> List[tuple]:
        """Search verses by Arabic text, English translation, English transliteration, or Urdu translation"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            wildcard = f"%{query}%"
            cursor.execute("""
                SELECT v.id, v.surah_number, v.ayah_number, v.arabic_text,
                       v.english_translation, v.transliteration, v.urdu_translation,
                       s.name_arabic, s.name_english, s.revelation_type
                FROM verses v
                JOIN surahs s ON v.surah_number = s.number
                WHERE v.arabic_text LIKE ?
                   OR v.english_translation LIKE ?
                   OR v.transliteration LIKE ?
                   OR v.urdu_translation LIKE ?
                LIMIT ?
            """, (wildcard, wildcard, wildcard, wildcard, limit))
            return cursor.fetchall()

# Global database instance
db_manager = DatabaseManager()

async def init_db():
    """Initialize database asynchronously"""
    try:
        db_manager.init_database()
        logger.info(f"Database initialized at: {DATABASE_PATH}")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise

def get_db():
    """Dependency to get database manager"""
    return db_manager