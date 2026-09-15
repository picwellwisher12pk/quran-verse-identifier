#!/usr/bin/env python3
"""
Database Initialization Script for Quran Verse Identifier
Sets up the SQLite database with initial Quran data
"""

import os
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")

import sys
if sys.platform == "win32":
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import logging

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import get_db
from app.services.quran_data import QuranDataManager

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s', handlers=[logging.StreamHandler(sys.stdout)])
logger = logging.getLogger(__name__)

def main():
    """Initialize the database with Quran data"""
    try:
        logger.info("🚀 Starting database initialization...")

        # Initialize database manager
        db = get_db()

        # Create tables
        logger.info("Creating database tables...")
        db.init_database()

        # Load Quran data
        logger.info("Loading Quran data...")
        quran_manager = QuranDataManager()

        if quran_manager.load_quran_data():
            logger.info("✅ Quran data loaded successfully")
        else:
            logger.error("❌ Failed to load Quran data")
            return 1

        # Get and display statistics
        stats = db.get_database_stats()
        logger.info(f"📊 Database Statistics:")
        logger.info(f"   Total Surahs: {stats['total_surahs']}")
        logger.info(f"   Total Verses: {stats['total_verses']}")
        logger.info(f"   Verses with Audio: {stats['verses_with_audio']}")

        logger.info("✅ Database initialization completed successfully!")

        print("\n🎯 Next Steps:")
        print("1. Run 'python scripts/download_audio.py' to download audio files")
        print("2. Start the API server: 'python run.py'")
        print("3. Visit http://localhost:8000/docs for API documentation")

        return 0

    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())