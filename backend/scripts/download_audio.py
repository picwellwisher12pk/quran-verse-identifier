import os
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")

import sys
if sys.platform == "win32":
    # Enable UTF-8 encoding on Windows console
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import requests
import time
import logging
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urljoin
import argparse

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import get_db
from app.services.audio_processor import AudioProcessor
from app.services.quran_data import QuranDataManager

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('download_log.txt', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class AudioDownloader:
    def __init__(self, base_url: str = "https://www.everyayah.com/data/",
                 reciter: str = "Alafasy_128kbps",
                 audio_dir: str = "audio_files"):
        self.base_url = base_url
        self.reciter = reciter
        self.audio_dir = os.path.abspath(audio_dir)
        self.db = get_db()
        self.audio_processor = AudioProcessor()

        # Create audio directory
        os.makedirs(self.audio_dir, exist_ok=True)

        logger.info(f"AudioDownloader initialized")
        logger.info(f"Base URL: {self.base_url}")
        logger.info(f"Reciter: {self.reciter}")
        logger.info(f"Audio directory: {self.audio_dir}")

    def get_audio_url(self, surah_number: int, ayah_number: int) -> str:
        """Generate the audio URL for a specific verse"""
        # EveryAyah.com URL format: reciter/surah_padded/ayah_padded.mp3
        surah_padded = f"{surah_number:03d}"
        ayah_padded = f"{ayah_number:03d}"
        filename = f"{surah_padded}{ayah_padded}.mp3"
        return urljoin(self.base_url, f"{self.reciter}/{filename}")

    def get_local_path(self, surah_number: int, ayah_number: int) -> str:
        """Get local file path for a verse audio file"""
        filename = f"{surah_number:03d}_{ayah_number:03d}.mp3"
        return os.path.join(self.audio_dir, filename)

    def download_verse_audio(self, surah_number: int, ayah_number: int) -> Optional[str]:
        """Download audio for a specific verse"""
        try:
            url = self.get_audio_url(surah_number, ayah_number)
            local_path = self.get_local_path(surah_number, ayah_number)

            # Skip if file already exists
            if os.path.exists(local_path):
                logger.info(f"Audio already exists: {surah_number}:{ayah_number}")
                return local_path

            # Download the file
            logger.info(f"Downloading: {surah_number}:{ayah_number} from {url}")

            response = requests.get(url, timeout=30)
            response.raise_for_status()

            # Save to file
            with open(local_path, 'wb') as f:
                f.write(response.content)

            logger.info(f"Downloaded: {local_path} ({len(response.content)} bytes)")
            return local_path

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to download {surah_number}:{ayah_number}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error downloading {surah_number}:{ayah_number}: {e}")
            return None

    def process_audio_fingerprint(self, surah_number: int, ayah_number: int, audio_path: str) -> bool:
        """Process audio file and store fingerprint in database"""
        try:
            # Extract fingerprint
            fingerprint = self.audio_processor.extract_fingerprint(audio_path)

            # Update database with fingerprint (or insert if verse row not yet seeded)
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO verses (surah_number, ayah_number, arabic_text, fingerprint_data, updated_at)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(surah_number, ayah_number) DO UPDATE SET
                        fingerprint_data = excluded.fingerprint_data,
                        updated_at = CURRENT_TIMESTAMP
                """, (surah_number, ayah_number, f"Surah {surah_number}, Ayah {ayah_number}", fingerprint))

                conn.commit()
                logger.info(f"Saved fingerprint for {surah_number}:{ayah_number}")
                return True

        except Exception as e:
            logger.error(f"Error processing fingerprint for {surah_number}:{ayah_number}: {e}")
            return False

    def download_and_process_verse(self, surah_number: int, ayah_number: int) -> Dict:
        """Download audio and process fingerprint for a single verse"""
        start_time = time.time()
        result = {
            'surah_number': surah_number,
            'ayah_number': ayah_number,
            'success': False,
            'downloaded': False,
            'fingerprinted': False,
            'error': None,
            'processing_time': 0
        }

        try:
            # Download audio
            audio_path = self.download_verse_audio(surah_number, ayah_number)
            if audio_path:
                result['downloaded'] = True

                # Process fingerprint
                if self.process_audio_fingerprint(surah_number, ayah_number, audio_path):
                    result['fingerprinted'] = True
                    result['success'] = True

        except Exception as e:
            result['error'] = str(e)
            logger.error(f"Error processing verse {surah_number}:{ayah_number}: {e}")

        result['processing_time'] = time.time() - start_time
        return result

    def download_surah(self, surah_number: int, max_workers: int = 5) -> List[Dict]:
        """Download all verses for a specific surah"""
        logger.info(f"Starting download for Surah {surah_number}")

        # Get ayah count for this surah
        surahs = self.db.get_all_surahs()
        surah_info = next((s for s in surahs if s[1] == surah_number), None)

        if not surah_info:
            logger.error(f"Surah {surah_number} not found in database")
            return []

        ayah_count = surah_info[5]  # ayah_count is at index 5
        logger.info(f"Surah {surah_number} has {ayah_count} ayahs")

        # Download verses in parallel
        results = []
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all download tasks
            future_to_verse = {
                executor.submit(self.download_and_process_verse, surah_number, ayah_num): (surah_number, ayah_num)
                for ayah_num in range(1, ayah_count + 1)
            }

            # Collect results as they complete
            for future in as_completed(future_to_verse):
                surah, ayah = future_to_verse[future]
                try:
                    result = future.result()
                    results.append(result)

                    if result['success']:
                        logger.info(f"✓ Processed {surah}:{ayah} ({result['processing_time']:.2f}s)")
                    else:
                        logger.warning(f"✗ Failed {surah}:{ayah}: {result['error']}")

                except Exception as e:
                    logger.error(f"Exception processing {surah}:{ayah}: {e}")
                    results.append({
                        'surah_number': surah,
                        'ayah_number': ayah,
                        'success': False,
                        'error': str(e)
                    })

        return results

    def download_all_surahs(self, start_surah: int = 1, end_surah: int = 114, max_workers: int = 3) -> Dict:
        """Download audio for all surahs (or a range)"""
        logger.info(f"Starting bulk download: Surahs {start_surah}-{end_surah}")

        overall_stats = {
            'total_verses': 0,
            'successful_downloads': 0,
            'successful_fingerprints': 0,
            'failed_downloads': 0,
            'surahs_processed': 0,
            'start_time': time.time()
        }

        for surah_num in range(start_surah, end_surah + 1):
            logger.info(f"Processing Surah {surah_num}...")

            surah_results = self.download_surah(surah_num, max_workers)

            # Update stats
            overall_stats['total_verses'] += len(surah_results)
            overall_stats['successful_downloads'] += sum(1 for r in surah_results if r['downloaded'])
            overall_stats['successful_fingerprints'] += sum(1 for r in surah_results if r['fingerprinted'])
            overall_stats['failed_downloads'] += sum(1 for r in surah_results if not r['success'])
            overall_stats['surahs_processed'] += 1

            # Progress update
            success_rate = (overall_stats['successful_fingerprints'] / overall_stats['total_verses']) * 100
            logger.info(f"Progress: Surah {surah_num} complete. Overall success rate: {success_rate:.1f}%")

            # Small delay between surahs to be respectful to the server
            time.sleep(1)

        overall_stats['end_time'] = time.time()
        overall_stats['total_time'] = overall_stats['end_time'] - overall_stats['start_time']

        return overall_stats

    def cleanup_failed_downloads(self) -> int:
        """Remove incomplete or corrupted audio files"""
        cleaned_count = 0

        for filename in os.listdir(self.audio_dir):
            if not filename.endswith('.mp3'):
                continue

            file_path = os.path.join(self.audio_dir, filename)

            try:
                # Check file size (very small files are likely failed downloads)
                if os.path.getsize(file_path) < 1000:  # Less than 1KB
                    os.remove(file_path)
                    logger.info(f"Removed small file: {filename}")
                    cleaned_count += 1

            except Exception as e:
                logger.error(f"Error checking file {filename}: {e}")

        logger.info(f"Cleaned up {cleaned_count} failed downloads")
        return cleaned_count

    def get_download_stats(self) -> Dict:
        """Get statistics about downloaded files"""
        stats = {
            'total_audio_files': 0,
            'total_size_mb': 0,
            'verses_with_fingerprints': 0,
            'verses_without_fingerprints': 0
        }

        # Count audio files
        if os.path.exists(self.audio_dir):
            for filename in os.listdir(self.audio_dir):
                if filename.endswith('.mp3'):
                    file_path = os.path.join(self.audio_dir, filename)
                    stats['total_audio_files'] += 1
                    stats['total_size_mb'] += os.path.getsize(file_path) / (1024 * 1024)

        # Count database fingerprints
        db_stats = self.db.get_database_stats()
        stats['verses_with_fingerprints'] = db_stats['verses_with_audio']
        stats['verses_without_fingerprints'] = db_stats['total_verses'] - db_stats['verses_with_audio']

        return stats

def main():
    parser = argparse.ArgumentParser(description="Download Quran audio files and generate fingerprints")
    parser.add_argument('--surah', type=int, help='Download specific surah only')
    parser.add_argument('--start', type=int, default=1, help='Start surah number (default: 1)')
    parser.add_argument('--end', type=int, default=114, help='End surah number (default: 114)')
    parser.add_argument('--reciter', default='Alafasy_128kbps', help='Reciter name (default: Alafasy_128kbps)')
    parser.add_argument('--workers', type=int, default=3, help='Number of concurrent downloads (default: 3)')
    parser.add_argument('--cleanup', action='store_true', help='Clean up failed downloads')
    parser.add_argument('--stats', action='store_true', help='Show download statistics')

    args = parser.parse_args()

    # Initialize downloader
    downloader = AudioDownloader(reciter=args.reciter)

    try:
        if args.cleanup:
            downloader.cleanup_failed_downloads()

        elif args.stats:
            stats = downloader.get_download_stats()
            print("\n📊 Download Statistics:")
            print(f"Audio files: {stats['total_audio_files']}")
            print(f"Total size: {stats['total_size_mb']:.1f} MB")
            print(f"Verses with fingerprints: {stats['verses_with_fingerprints']}")
            print(f"Verses without fingerprints: {stats['verses_without_fingerprints']}")

        elif args.surah:
            # Download specific surah
            results = downloader.download_surah(args.surah, args.workers)
            successful = sum(1 for r in results if r['success'])
            print(f"\n✅ Completed Surah {args.surah}: {successful}/{len(results)} verses processed successfully")

        else:
            # Download range of surahs
            stats = downloader.download_all_surahs(args.start, args.end, args.workers)

            print(f"\n🎯 Download Complete!")
            print(f"Total verses processed: {stats['total_verses']}")
            print(f"Successful downloads: {stats['successful_downloads']}")
            print(f"Successful fingerprints: {stats['successful_fingerprints']}")
            print(f"Failed downloads: {stats['failed_downloads']}")
            print(f"Total time: {stats['total_time']:.1f} seconds")
            print(f"Success rate: {(stats['successful_fingerprints']/stats['total_verses']*100):.1f}%")

    except KeyboardInterrupt:
        logger.info("Download interrupted by user")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return 1

    return 0

if __name__ == "__main__":
    sys.exit(main())