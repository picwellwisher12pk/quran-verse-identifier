import sqlite3
import os
from pathlib import Path

def check_database():
    base_dir = Path(__file__).resolve().parent
    db_path = base_dir / "data" / "quran.db"
    if not db_path.exists():
        db_path = Path("backend/data/quran.db").resolve()
    if not db_path.exists():
        db_path = Path("data/quran.db").resolve()
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return
        
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Check surahs table
    print("\n=== Surahs ===")
    cursor.execute("SELECT * FROM surahs")
    surahs = cursor.fetchall()
    print(f"Found {len(surahs)} surahs in database")
    
    # Check verses with fingerprints
    print("\n=== Verses with Fingerprints ===")
    cursor.execute("""
        SELECT v.surah_number, s.name_english, COUNT(*) as verse_count 
        FROM verses v
        JOIN surahs s ON v.surah_number = s.number
        WHERE v.fingerprint_data IS NOT NULL
        GROUP BY v.surah_number
        ORDER BY v.surah_number
    """)
    
    results = cursor.fetchall()
    if not results:
        print("No verses with fingerprints found in database")
    else:
        print("\nSurahs with fingerprinted verses:")
        print("Surah | Name                 | Verse Count")
        print("------|----------------------|------------")
        for surah_num, surah_name, count in results:
            print(f"{surah_num:5} | {surah_name:<20} | {count}")
    
    # Check total verses with fingerprints
    cursor.execute("SELECT COUNT(*) FROM verses WHERE fingerprint_data IS NOT NULL")
    total_fingerprinted = cursor.fetchone()[0]
    print(f"\nTotal verses with fingerprints: {total_fingerprinted}")
    
    conn.close()

if __name__ == "__main__":
    check_database()
