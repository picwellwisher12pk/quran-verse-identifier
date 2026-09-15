import json
import hashlib
import logging
from typing import Optional, Tuple, Dict, Any, Union, List
import librosa
import numpy as np
from scipy.spatial.distance import cosine, euclidean
from fastdtw import fastdtw

logger = logging.getLogger(__name__)

class AudioProcessor:
    def __init__(self, sample_rate: int = 22050, n_mfcc: int = 13):
        self.sample_rate = sample_rate
        self.n_mfcc = n_mfcc
        logger.info(f"AudioProcessor initialized with sample_rate={sample_rate}, n_mfcc={n_mfcc}")

    def load_audio(self, file_path: str) -> Tuple[np.ndarray, int]:
        """Load audio file with multiple fallback methods."""
        backends = [
            {'name': 'soundfile', 'func': lambda f: librosa.load(f, sr=self.sample_rate, mono=True, res_type='kaiser_fast')},
            {'name': 'soxr', 'func': lambda f: librosa.load(f, sr=self.sample_rate, mono=True, res_type='soxr_vhq')},
            {'name': 'basic', 'func': lambda f: librosa.load(f, sr=self.sample_rate, mono=True, res_type='scipy')},
            {'name': 'direct', 'func': lambda f: librosa.load(f, sr=None, mono=True)}
        ]

        last_error = None
        for backend in backends:
            try:
                audio, sr = backend['func'](file_path)
                if sr != self.sample_rate and backend['name'] == 'direct':
                    audio = librosa.resample(audio, orig_sr=sr, target_sr=self.sample_rate)
                    sr = self.sample_rate
                return audio, sr
            except Exception as e:
                last_error = e
                continue

        raise RuntimeError(f"Failed to load audio {file_path} with all backends. Last error: {str(last_error)}")

    def _reduce_noise(self, audio: np.ndarray, sr: int) -> np.ndarray:
        """Apply lightweight spectral subtraction for noise reduction."""
        try:
            stft = librosa.stft(audio, n_fft=1024, hop_length=512)
            magnitude, phase = librosa.magphase(stft)
            noise_len = min(magnitude.shape[1], max(1, int(0.1 * sr / 512)))
            noise_frames = magnitude[:, :noise_len]
            noise_profile = np.median(noise_frames, axis=1, keepdims=True)
            clean_magnitude = np.maximum(magnitude - 1.2 * noise_profile, 0.1 * noise_profile)
            clean_stft = clean_magnitude * phase
            return librosa.istft(clean_stft, hop_length=512)
        except Exception as e:
            logger.warning(f"Noise reduction skipped: {e}")
            return audio

    def extract_features(self, audio: np.ndarray, sr: int) -> Dict[str, Any]:
        """Extract comprehensive audio features including temporal frames for DTW and summary vector for fast search."""
        try:
            # Pre-processing
            audio = librosa.effects.preemphasis(audio)
            audio = self._reduce_noise(audio, sr)

            duration = float(len(audio) / sr)

            # Extract MFCCs across time with hop_length=1024 (~21 fps at 22050Hz)
            hop_length = 1024
            mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=self.n_mfcc, n_fft=2048, hop_length=hop_length)
            mfcc_delta = librosa.feature.delta(mfcc)

            # Temporal frames: shape (T, n_mfcc) for alignment
            temporal_frames = np.round(mfcc.T, 3).tolist()

            # Spectral features
            chroma = librosa.feature.chroma_stft(y=audio, sr=sr, hop_length=hop_length)
            spectral_centroid = librosa.feature.spectral_centroid(y=audio, sr=sr, hop_length=hop_length)[0]
            spectral_bandwidth = librosa.feature.spectral_bandwidth(y=audio, sr=sr, hop_length=hop_length)[0]
            spectral_rolloff = librosa.feature.spectral_rolloff(y=audio, sr=sr, hop_length=hop_length)[0]
            zero_crossing_rate = librosa.feature.zero_crossing_rate(audio, hop_length=hop_length)[0]
            rms_energy = librosa.feature.rms(y=audio, hop_length=hop_length)[0]

            mfcc_mean = np.mean(mfcc, axis=1)
            mfcc_std = np.std(mfcc, axis=1)
            chroma_mean = np.mean(chroma, axis=1)

            # Compact summary vector for fast Tier-1 screening (L2-normalized)
            raw_summary = np.concatenate([
                mfcc_mean,
                mfcc_std,
                chroma_mean,
                [
                    float(np.mean(spectral_centroid) / 5000.0),
                    float(np.mean(spectral_bandwidth) / 5000.0),
                    float(np.mean(spectral_rolloff) / 10000.0),
                    float(np.mean(zero_crossing_rate)),
                    float(np.mean(rms_energy))
                ]
            ])
            norm = np.linalg.norm(raw_summary)
            summary_vector = (raw_summary / (norm + 1e-9)).round(4).tolist()

            return {
                'mfcc': {
                    'mean': np.round(mfcc_mean, 3).tolist(),
                    'delta_mean': np.round(np.mean(mfcc_delta, axis=1), 3).tolist()
                },
                'spectral': {
                    'centroid': float(np.mean(spectral_centroid)),
                    'bandwidth': float(np.mean(spectral_bandwidth)),
                    'rolloff': float(np.mean(spectral_rolloff)),
                    'zcr': float(np.mean(zero_crossing_rate)),
                    'energy': float(np.mean(rms_energy)),
                    'chroma': np.round(chroma_mean, 3).tolist()
                },
                'summary_vector': summary_vector,
                'temporal_frames': temporal_frames,
                'duration': duration
            }

        except Exception as e:
            logger.error(f"Error extracting features: {e}")
            raise

    def create_fingerprint_hash(self, features: Dict[str, Any]) -> str:
        """Create a hash-based fingerprint from features."""
        try:
            summary = features.get('summary_vector') or features.get('mfcc', {}).get('mean', [])
            feature_string = json.dumps(summary, sort_keys=True)
            return hashlib.sha256(feature_string.encode()).hexdigest()
        except Exception as e:
            logger.error(f"Error creating fingerprint hash: {e}")
            raise

    def extract_fingerprint(self, file_path: str) -> str:
        """Extract complete audio fingerprint from file."""
        try:
            audio, sr = self.load_audio(file_path)
            features = self.extract_features(audio, sr)

            fingerprint = {
                'features': features,
                'sample_rate': sr,
                'version': '2.0',
                'hash': self.create_fingerprint_hash(features),
                'duration': features['duration']
            }

            return json.dumps(fingerprint)

        except Exception as e:
            logger.error(f"Error extracting fingerprint: {e}")
            raise

    @staticmethod
    def parse_fingerprint_dict(fp: Union[Dict[str, Any], str]) -> Dict[str, Any]:
        """Parse fingerprint safely if it is a JSON string."""
        if isinstance(fp, str):
            try:
                return json.loads(fp)
            except Exception:
                return {}
        return fp if isinstance(fp, dict) else {}

    def compute_summary_similarity(self, v1: List[float], v2: List[float]) -> float:
        """Compute cosine similarity between two summary vectors."""
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        try:
            dot = np.dot(v1, v2)
            norm1 = np.linalg.norm(v1)
            norm2 = np.linalg.norm(v2)
            if norm1 == 0 or norm2 == 0:
                return 0.0
            cos_sim = float(dot / (norm1 * norm2))
            return max(0.0, min(1.0, (cos_sim + 1.0) / 2.0))
        except Exception:
            return 0.0

    def compare_fingerprints(self, fp1: Union[Dict[str, Any], str], fp2: Union[Dict[str, Any], str]) -> float:
        """Compare two fingerprints using two-tier feature fusion (temporal DTW + spectral/summary)."""
        try:
            d1 = self.parse_fingerprint_dict(fp1)
            d2 = self.parse_fingerprint_dict(fp2)

            f1 = d1.get('features', {})
            f2 = d2.get('features', {})

            if not f1 or not f2:
                return 0.0

            # 1. Summary similarity
            v1 = f1.get('summary_vector')
            v2 = f2.get('summary_vector')
            summary_sim = self.compute_summary_similarity(v1, v2) if (v1 and v2) else 0.5

            # 2. Temporal DTW similarity
            tf1 = f1.get('temporal_frames')
            tf2 = f2.get('temporal_frames')

            dtw_sim = summary_sim
            if tf1 and tf2 and len(tf1) > 2 and len(tf2) > 2:
                try:
                    seq1 = np.array(tf1, dtype=np.float32)
                    seq2 = np.array(tf2, dtype=np.float32)

                    # Subsample if sequence is exceptionally long (> 400 frames)
                    if len(seq1) > 400:
                        step1 = int(np.ceil(len(seq1) / 400))
                        seq1 = seq1[::step1]
                    if len(seq2) > 400:
                        step2 = int(np.ceil(len(seq2) / 400))
                        seq2 = seq2[::step2]

                    distance, _ = fastdtw(seq1, seq2, dist=euclidean)
                    # Normalize by average frame length and coefficient dimension
                    avg_len = (len(seq1) + len(seq2)) / 2.0
                    normalized_dist = distance / (avg_len * seq1.shape[1] * 20.0 + 1e-6)
                    dtw_sim = float(np.exp(-normalized_dist))
                except Exception as e:
                    logger.warning(f"DTW calculation fallback: {e}")
                    dtw_sim = summary_sim

            # 3. Duration similarity factor
            dur1 = f1.get('duration', 0)
            dur2 = f2.get('duration', 0)
            dur_sim = 1.0
            if dur1 > 0 and dur2 > 0:
                dur_sim = float(min(dur1, dur2) / max(dur1, dur2))

            # Final blended score
            final_score = (0.55 * dtw_sim) + (0.35 * summary_sim) + (0.10 * dur_sim)
            return float(max(0.0, min(1.0, final_score)))

        except Exception as e:
            logger.error(f"Error in compare_fingerprints: {e}", exc_info=True)
            return 0.0
