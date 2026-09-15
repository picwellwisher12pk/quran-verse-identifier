import json
import os
import logging
from typing import Dict, List, Tuple, Optional
import requests
from app.core.database import get_db

logger = logging.getLogger(__name__)

class QuranDataManager:
    def __init__(self):
        self.db = get_db()
        self.data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
        os.makedirs(self.data_dir, exist_ok=True)

    def load_quran_data(self) -> bool:
        """Load Quran data into database (surahs and complete verses)"""
        try:
            # 1. Basic Quran structure - 114 Surahs
            surahs_data = self._get_surahs_data()
            for surah in surahs_data:
                self.db.insert_surah(
                    number=surah['number'],
                    name_arabic=surah['name_arabic'],
                    name_english=surah['name_english'],
                    revelation_type=surah['revelation_type'],
                    ayah_count=surah['ayah_count']
                )
            logger.info(f"Loaded {len(surahs_data)} surahs into database")

            # 2. Insert sample verses first as guaranteed fallback
            sample_verses = self._get_sample_verses()
            self.db.insert_verses_batch(sample_verses)
            logger.info(f"Loaded {len(sample_verses)} sample verses")

            # 3. Ingest complete 6,236 Quran verses
            if self.fetch_complete_quran():
                logger.info("Complete Quran (6,236 verses) loaded successfully")
            else:
                logger.warning("Could not download complete Quran text, relying on sample verses")

            return True

        except Exception as e:
            logger.error(f"Error loading Quran data: {e}")
            return False

    def _get_surahs_data(self) -> List[Dict]:
        """Get the list of all 114 surahs with their information"""
        return [
            {"number": 1, "name_arabic": "الفاتحة", "name_english": "Al-Fatihah", "revelation_type": "Meccan", "ayah_count": 7},
            {"number": 2, "name_arabic": "البقرة", "name_english": "Al-Baqarah", "revelation_type": "Medinan", "ayah_count": 286},
            {"number": 3, "name_arabic": "آل عمران", "name_english": "Aal-E-Imran", "revelation_type": "Medinan", "ayah_count": 200},
            {"number": 4, "name_arabic": "النساء", "name_english": "An-Nisa", "revelation_type": "Medinan", "ayah_count": 176},
            {"number": 5, "name_arabic": "المائدة", "name_english": "Al-Maidah", "revelation_type": "Medinan", "ayah_count": 120},
            {"number": 6, "name_arabic": "الأنعام", "name_english": "Al-Anaam", "revelation_type": "Meccan", "ayah_count": 165},
            {"number": 7, "name_arabic": "الأعراف", "name_english": "Al-Araf", "revelation_type": "Meccan", "ayah_count": 206},
            {"number": 8, "name_arabic": "الأنفال", "name_english": "Al-Anfal", "revelation_type": "Medinan", "ayah_count": 75},
            {"number": 9, "name_arabic": "التوبة", "name_english": "At-Tawbah", "revelation_type": "Medinan", "ayah_count": 129},
            {"number": 10, "name_arabic": "يونس", "name_english": "Yunus", "revelation_type": "Meccan", "ayah_count": 109},
            {"number": 11, "name_arabic": "هود", "name_english": "Hud", "revelation_type": "Meccan", "ayah_count": 123},
            {"number": 12, "name_arabic": "يوسف", "name_english": "Yusuf", "revelation_type": "Meccan", "ayah_count": 111},
            {"number": 13, "name_arabic": "الرعد", "name_english": "Ar-Rad", "revelation_type": "Medinan", "ayah_count": 43},
            {"number": 14, "name_arabic": "إبراهيم", "name_english": "Ibrahim", "revelation_type": "Meccan", "ayah_count": 52},
            {"number": 15, "name_arabic": "الحجر", "name_english": "Al-Hijr", "revelation_type": "Meccan", "ayah_count": 99},
            {"number": 16, "name_arabic": "النحل", "name_english": "An-Nahl", "revelation_type": "Meccan", "ayah_count": 128},
            {"number": 17, "name_arabic": "الإسراء", "name_english": "Al-Isra", "revelation_type": "Meccan", "ayah_count": 111},
            {"number": 18, "name_arabic": "الكهف", "name_english": "Al-Kahf", "revelation_type": "Meccan", "ayah_count": 110},
            {"number": 19, "name_arabic": "مريم", "name_english": "Maryam", "revelation_type": "Meccan", "ayah_count": 98},
            {"number": 20, "name_arabic": "طه", "name_english": "Taha", "revelation_type": "Meccan", "ayah_count": 135},
            {"number": 21, "name_arabic": "الأنبياء", "name_english": "Al-Anbiya", "revelation_type": "Meccan", "ayah_count": 112},
            {"number": 22, "name_arabic": "الحج", "name_english": "Al-Hajj", "revelation_type": "Medinan", "ayah_count": 78},
            {"number": 23, "name_arabic": "المؤمنون", "name_english": "Al-Muminun", "revelation_type": "Meccan", "ayah_count": 118},
            {"number": 24, "name_arabic": "النور", "name_english": "An-Nur", "revelation_type": "Medinan", "ayah_count": 64},
            {"number": 25, "name_arabic": "الفرقان", "name_english": "Al-Furqan", "revelation_type": "Meccan", "ayah_count": 77},
            {"number": 26, "name_arabic": "الشعراء", "name_english": "Ash-Shuara", "revelation_type": "Meccan", "ayah_count": 227},
            {"number": 27, "name_arabic": "النمل", "name_english": "An-Naml", "revelation_type": "Meccan", "ayah_count": 93},
            {"number": 28, "name_arabic": "القصص", "name_english": "Al-Qasas", "revelation_type": "Meccan", "ayah_count": 88},
            {"number": 29, "name_arabic": "العنكبوت", "name_english": "Al-Ankabut", "revelation_type": "Meccan", "ayah_count": 69},
            {"number": 30, "name_arabic": "الروم", "name_english": "Ar-Rum", "revelation_type": "Meccan", "ayah_count": 60},
            {"number": 31, "name_arabic": "لقمان", "name_english": "Luqman", "revelation_type": "Meccan", "ayah_count": 34},
            {"number": 32, "name_arabic": "السجدة", "name_english": "As-Sajdah", "revelation_type": "Meccan", "ayah_count": 30},
            {"number": 33, "name_arabic": "الأحزاب", "name_english": "Al-Ahzab", "revelation_type": "Medinan", "ayah_count": 73},
            {"number": 34, "name_arabic": "سبأ", "name_english": "Saba", "revelation_type": "Meccan", "ayah_count": 54},
            {"number": 35, "name_arabic": "فاطر", "name_english": "Fatir", "revelation_type": "Meccan", "ayah_count": 45},
            {"number": 36, "name_arabic": "يس", "name_english": "Ya-Sin", "revelation_type": "Meccan", "ayah_count": 83},
            {"number": 37, "name_arabic": "الصافات", "name_english": "As-Saffat", "revelation_type": "Meccan", "ayah_count": 182},
            {"number": 38, "name_arabic": "ص", "name_english": "Sad", "revelation_type": "Meccan", "ayah_count": 88},
            {"number": 39, "name_arabic": "الزمر", "name_english": "Az-Zumar", "revelation_type": "Meccan", "ayah_count": 75},
            {"number": 40, "name_arabic": "غافر", "name_english": "Ghafir", "revelation_type": "Meccan", "ayah_count": 85},
            {"number": 41, "name_arabic": "فصلت", "name_english": "Fussilat", "revelation_type": "Meccan", "ayah_count": 54},
            {"number": 42, "name_arabic": "الشورى", "name_english": "Ash-Shuraa", "revelation_type": "Meccan", "ayah_count": 53},
            {"number": 43, "name_arabic": "الزخرف", "name_english": "Az-Zukhruf", "revelation_type": "Meccan", "ayah_count": 89},
            {"number": 44, "name_arabic": "الدخان", "name_english": "Ad-Dukhan", "revelation_type": "Meccan", "ayah_count": 59},
            {"number": 45, "name_arabic": "الجاثية", "name_english": "Al-Jathiyah", "revelation_type": "Meccan", "ayah_count": 37},
            {"number": 46, "name_arabic": "الأحقاف", "name_english": "Al-Ahqaf", "revelation_type": "Meccan", "ayah_count": 35},
            {"number": 47, "name_arabic": "محمد", "name_english": "Muhammad", "revelation_type": "Medinan", "ayah_count": 38},
            {"number": 48, "name_arabic": "الفتح", "name_english": "Al-Fath", "revelation_type": "Medinan", "ayah_count": 29},
            {"number": 49, "name_arabic": "الحجرات", "name_english": "Al-Hujurat", "revelation_type": "Medinan", "ayah_count": 18},
            {"number": 50, "name_arabic": "ق", "name_english": "Qaf", "revelation_type": "Meccan", "ayah_count": 45},
            {"number": 51, "name_arabic": "الذاريات", "name_english": "Az-Zariyat", "revelation_type": "Meccan", "ayah_count": 60},
            {"number": 52, "name_arabic": "الطور", "name_english": "At-Tur", "revelation_type": "Meccan", "ayah_count": 49},
            {"number": 53, "name_arabic": "النجم", "name_english": "An-Najm", "revelation_type": "Meccan", "ayah_count": 62},
            {"number": 54, "name_arabic": "القمر", "name_english": "Al-Qamar", "revelation_type": "Meccan", "ayah_count": 55},
            {"number": 55, "name_arabic": "الرحمن", "name_english": "Ar-Rahman", "revelation_type": "Medinan", "ayah_count": 78},
            {"number": 56, "name_arabic": "الواقعة", "name_english": "Al-Waqiah", "revelation_type": "Meccan", "ayah_count": 96},
            {"number": 57, "name_arabic": "الحديد", "name_english": "Al-Hadid", "revelation_type": "Medinan", "ayah_count": 29},
            {"number": 58, "name_arabic": "المجادلة", "name_english": "Al-Mujadilah", "revelation_type": "Medinan", "ayah_count": 22},
            {"number": 59, "name_arabic": "الحشر", "name_english": "Al-Hashr", "revelation_type": "Medinan", "ayah_count": 24},
            {"number": 60, "name_arabic": "الممتحنة", "name_english": "Al-Mumtahanah", "revelation_type": "Medinan", "ayah_count": 13},
            {"number": 61, "name_arabic": "الصف", "name_english": "As-Saff", "revelation_type": "Medinan", "ayah_count": 14},
            {"number": 62, "name_arabic": "الجمعة", "name_english": "Al-Jumuah", "revelation_type": "Medinan", "ayah_count": 11},
            {"number": 63, "name_arabic": "المنافقون", "name_english": "Al-Munafiqun", "revelation_type": "Medinan", "ayah_count": 11},
            {"number": 64, "name_arabic": "التغابن", "name_english": "At-Taghabun", "revelation_type": "Medinan", "ayah_count": 18},
            {"number": 65, "name_arabic": "الطلاق", "name_english": "At-Talaq", "revelation_type": "Medinan", "ayah_count": 12},
            {"number": 66, "name_arabic": "التحريم", "name_english": "At-Tahrim", "revelation_type": "Medinan", "ayah_count": 12},
            {"number": 67, "name_arabic": "الملك", "name_english": "Al-Mulk", "revelation_type": "Meccan", "ayah_count": 30},
            {"number": 68, "name_arabic": "القلم", "name_english": "Al-Qalam", "revelation_type": "Meccan", "ayah_count": 52},
            {"number": 69, "name_arabic": "الحاقة", "name_english": "Al-Haqqah", "revelation_type": "Meccan", "ayah_count": 52},
            {"number": 70, "name_arabic": "المعارج", "name_english": "Al-Maarij", "revelation_type": "Meccan", "ayah_count": 44},
            {"number": 71, "name_arabic": "نوح", "name_english": "Nuh", "revelation_type": "Meccan", "ayah_count": 28},
            {"number": 72, "name_arabic": "الجن", "name_english": "Al-Jinn", "revelation_type": "Meccan", "ayah_count": 28},
            {"number": 73, "name_arabic": "المزمل", "name_english": "Al-Muzzammil", "revelation_type": "Meccan", "ayah_count": 20},
            {"number": 74, "name_arabic": "المدثر", "name_english": "Al-Muddaththir", "revelation_type": "Meccan", "ayah_count": 56},
            {"number": 75, "name_arabic": "القيامة", "name_english": "Al-Qiyamah", "revelation_type": "Meccan", "ayah_count": 40},
            {"number": 76, "name_arabic": "الإنسان", "name_english": "Al-Insan", "revelation_type": "Medinan", "ayah_count": 31},
            {"number": 77, "name_arabic": "المرسلات", "name_english": "Al-Mursalat", "revelation_type": "Meccan", "ayah_count": 50},
            {"number": 78, "name_arabic": "النبأ", "name_english": "An-Naba", "revelation_type": "Meccan", "ayah_count": 40},
            {"number": 79, "name_arabic": "النازعات", "name_english": "An-Naziat", "revelation_type": "Meccan", "ayah_count": 46},
            {"number": 80, "name_arabic": "عبس", "name_english": "Abasa", "revelation_type": "Meccan", "ayah_count": 42},
            {"number": 81, "name_arabic": "التكوير", "name_english": "At-Takwir", "revelation_type": "Meccan", "ayah_count": 29},
            {"number": 82, "name_arabic": "الانفطار", "name_english": "Al-Infitar", "revelation_type": "Meccan", "ayah_count": 19},
            {"number": 83, "name_arabic": "المطففين", "name_english": "Al-Mutaffifin", "revelation_type": "Meccan", "ayah_count": 36},
            {"number": 84, "name_arabic": "الانشقاق", "name_english": "Al-Inshiqaq", "revelation_type": "Meccan", "ayah_count": 25},
            {"number": 85, "name_arabic": "البروج", "name_english": "Al-Buruj", "revelation_type": "Meccan", "ayah_count": 22},
            {"number": 86, "name_arabic": "الطارق", "name_english": "At-Tariq", "revelation_type": "Meccan", "ayah_count": 17},
            {"number": 87, "name_arabic": "الأعلى", "name_english": "Al-Ala", "revelation_type": "Meccan", "ayah_count": 19},
            {"number": 88, "name_arabic": "الغاشية", "name_english": "Al-Ghashiyah", "revelation_type": "Meccan", "ayah_count": 26},
            {"number": 89, "name_arabic": "الفجر", "name_english": "Al-Fajr", "revelation_type": "Meccan", "ayah_count": 30},
            {"number": 90, "name_arabic": "البلد", "name_english": "Al-Balad", "revelation_type": "Meccan", "ayah_count": 20},
            {"number": 91, "name_arabic": "الشمس", "name_english": "Ash-Shams", "revelation_type": "Meccan", "ayah_count": 15},
            {"number": 92, "name_arabic": "الليل", "name_english": "Al-Lail", "revelation_type": "Meccan", "ayah_count": 21},
            {"number": 93, "name_arabic": "الضحى", "name_english": "Ad-Duhaa", "revelation_type": "Meccan", "ayah_count": 11},
            {"number": 94, "name_arabic": "الشرح", "name_english": "Ash-Sharh", "revelation_type": "Meccan", "ayah_count": 8},
            {"number": 95, "name_arabic": "التين", "name_english": "At-Tin", "revelation_type": "Meccan", "ayah_count": 8},
            {"number": 96, "name_arabic": "العلق", "name_english": "Al-Alaq", "revelation_type": "Meccan", "ayah_count": 19},
            {"number": 97, "name_arabic": "القدر", "name_english": "Al-Qadr", "revelation_type": "Meccan", "ayah_count": 5},
            {"number": 98, "name_arabic": "البينة", "name_english": "Al-Bayyinah", "revelation_type": "Medinan", "ayah_count": 8},
            {"number": 99, "name_arabic": "الزلزلة", "name_english": "Az-Zalzalah", "revelation_type": "Medinan", "ayah_count": 8},
            {"number": 100, "name_arabic": "العاديات", "name_english": "Al-Adiyat", "revelation_type": "Meccan", "ayah_count": 11},
            {"number": 101, "name_arabic": "القارعة", "name_english": "Al-Qariah", "revelation_type": "Meccan", "ayah_count": 11},
            {"number": 102, "name_arabic": "التكاثر", "name_english": "At-Takathur", "revelation_type": "Meccan", "ayah_count": 8},
            {"number": 103, "name_arabic": "العصر", "name_english": "Al-Asr", "revelation_type": "Meccan", "ayah_count": 3},
            {"number": 104, "name_arabic": "الهمزة", "name_english": "Al-Humazah", "revelation_type": "Meccan", "ayah_count": 9},
            {"number": 105, "name_arabic": "الفيل", "name_english": "Al-Fil", "revelation_type": "Meccan", "ayah_count": 5},
            {"number": 106, "name_arabic": "قريش", "name_english": "Quraish", "revelation_type": "Meccan", "ayah_count": 4},
            {"number": 107, "name_arabic": "الماعون", "name_english": "Al-Maun", "revelation_type": "Meccan", "ayah_count": 7},
            {"number": 108, "name_arabic": "الكوثر", "name_english": "Al-Kawthar", "revelation_type": "Meccan", "ayah_count": 3},
            {"number": 109, "name_arabic": "الكافرون", "name_english": "Al-Kafirun", "revelation_type": "Meccan", "ayah_count": 6},
            {"number": 110, "name_arabic": "النصر", "name_english": "An-Nasr", "revelation_type": "Medinan", "ayah_count": 3},
            {"number": 111, "name_arabic": "المسد", "name_english": "Al-Masad", "revelation_type": "Meccan", "ayah_count": 5},
            {"number": 112, "name_arabic": "الإخلاص", "name_english": "Al-Ikhlas", "revelation_type": "Meccan", "ayah_count": 4},
            {"number": 113, "name_arabic": "الفلق", "name_english": "Al-Falaq", "revelation_type": "Meccan", "ayah_count": 5},
            {"number": 114, "name_arabic": "الناس", "name_english": "An-Nas", "revelation_type": "Meccan", "ayah_count": 6}
        ]

    def _get_sample_verses(self) -> List[Dict]:
        """Get sample verses for demonstration"""
        return [
            {
                "surah_number": 1,
                "ayah_number": 1,
                "arabic_text": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
                "english_translation": "In the name of Allah, the Entirely Merciful, the Especially Merciful."
            },
            {
                "surah_number": 1,
                "ayah_number": 2,
                "arabic_text": "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
                "english_translation": "[All] praise is [due] to Allah, Lord of the worlds -"
            },
            {
                "surah_number": 1,
                "ayah_number": 3,
                "arabic_text": "الرَّحْمَٰنِ الرَّحِيمِ",
                "english_translation": "The Entirely Merciful, the Especially Merciful,"
            },
            {
                "surah_number": 1,
                "ayah_number": 4,
                "arabic_text": "مَالِكِ يَوْمِ الدِّينِ",
                "english_translation": "Sovereign of the Day of Recompense."
            },
            {
                "surah_number": 1,
                "ayah_number": 5,
                "arabic_text": "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
                "english_translation": "It is You we worship and You we ask for help."
            },
            {
                "surah_number": 1,
                "ayah_number": 6,
                "arabic_text": "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
                "english_translation": "Guide us to the straight path -"
            },
            {
                "surah_number": 1,
                "ayah_number": 7,
                "arabic_text": "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
                "english_translation": "The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray."
            },
            {
                "surah_number": 112,
                "ayah_number": 1,
                "arabic_text": "قُلْ هُوَ اللَّهُ أَحَدٌ",
                "english_translation": "Say, \"He is Allah, [who is] One,"
            },
            {
                "surah_number": 112,
                "ayah_number": 2,
                "arabic_text": "اللَّهُ الصَّمَدُ",
                "english_translation": "Allah, the Eternal Refuge."
            },
            {
                "surah_number": 112,
                "ayah_number": 3,
                "arabic_text": "لَمْ يَلِدْ وَلَمْ يُولَدْ",
                "english_translation": "He neither begets nor is born,"
            },
            {
                "surah_number": 112,
                "ayah_number": 4,
                "arabic_text": "وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ",
                "english_translation": "Nor is there to Him any equivalent.\""
            }
        ]

    def fetch_complete_quran(self) -> bool:
        """Fetch complete Quran (Arabic Uthmani + Saheeh International) from cache or API"""
        cache_file = os.path.join(self.data_dir, "quran_complete.json")

        # 1. Load from local cache if present
        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    all_verses = json.load(f)
                if len(all_verses) >= 6000:
                    self.db.insert_verses_batch(all_verses)
                    logger.info(f"Loaded {len(all_verses)} verses from cached quran_complete.json")
                    return True
            except Exception as e:
                logger.warning(f"Error reading cache file {cache_file}: {e}")

        # 2. Fetch from alquran.cloud API
        try:
            logger.info("Downloading Uthmani Quran text from API...")
            r_ar = requests.get("https://api.alquran.cloud/v1/quran/quran-uthmani", timeout=45)
            r_ar.raise_for_status()
            ar_surahs = r_ar.json().get('data', {}).get('surahs', [])

            logger.info("Downloading English translation from API...")
            r_en = requests.get("https://api.alquran.cloud/v1/quran/en.sahih", timeout=45)
            r_en.raise_for_status()
            en_surahs = r_en.json().get('data', {}).get('surahs', [])

            if not ar_surahs or not en_surahs:
                logger.error("Failed to retrieve surahs from API")
                return False

            all_verses = []
            for s_ar, s_en in zip(ar_surahs, en_surahs):
                surah_num = s_ar['number']
                for a_ar, a_en in zip(s_ar['ayahs'], s_en['ayahs']):
                    all_verses.append({
                        "surah_number": surah_num,
                        "ayah_number": a_ar['numberInSurah'],
                        "arabic_text": a_ar['text'],
                        "english_translation": a_en['text']
                    })

            # Cache locally
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(all_verses, f, ensure_ascii=False, indent=2)

            # Insert all verses into database
            self.db.insert_verses_batch(all_verses)
            logger.info(f"Successfully seeded {len(all_verses)} complete Quran verses!")
            return True

        except Exception as e:
            logger.error(f"Error downloading complete Quran: {e}")
            return False

    async def download_complete_quran(self, source: str = "alquran.cloud") -> bool:
        """Download complete Quran text asynchronously"""
        return self.fetch_complete_quran()

    def export_verses_to_json(self, output_path: str) -> bool:
        """Export all verses to JSON file"""
        try:
            verses = []

            # Get all verses from database
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT v.*, s.name_arabic, s.name_english
                    FROM verses v
                    JOIN surahs s ON v.surah_number = s.number
                    ORDER BY v.surah_number, v.ayah_number
                """)

                for row in cursor.fetchall():
                    verses.append({
                        "id": row[0],
                        "surah_number": row[1],
                        "ayah_number": row[2],
                        "arabic_text": row[3],
                        "english_translation": row[4],
                        "fingerprint_data": row[5],
                        "created_at": row[6],
                        "updated_at": row[7],
                        "surah_name_arabic": row[8],
                        "surah_name_english": row[9]
                    })

            # Write to JSON file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(verses, f, ensure_ascii=False, indent=2)

            logger.info(f"Exported {len(verses)} verses to {output_path}")
            return True

        except Exception as e:
            logger.error(f"Error exporting verses: {e}")
            return False

    def get_verse_context(self, surah_number: int, ayah_number: int, context_size: int = 2) -> List[Dict]:
        """Get verses around a specific verse for context"""
        try:
            verses = []

            # Get context verses (before and after)
            start_ayah = max(1, ayah_number - context_size)
            end_ayah = ayah_number + context_size

            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT * FROM verses
                    WHERE surah_number = ? AND ayah_number BETWEEN ? AND ?
                    ORDER BY ayah_number
                """, (surah_number, start_ayah, end_ayah))

                for row in cursor.fetchall():
                    verses.append({
                        "id": row[0],
                        "surah_number": row[1],
                        "ayah_number": row[2],
                        "arabic_text": row[3],
                        "english_translation": row[4],
                        "is_target": row[2] == ayah_number
                    })

            return verses

        except Exception as e:
            logger.error(f"Error getting verse context: {e}")
            return []