import React, { useState, useRef, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { FaPlay, FaPause, FaDownload } from 'react-icons/fa';
import { FiMoreHorizontal } from 'react-icons/fi';

const RECITERS = [
  { id: 'Alafasy_128kbps', name: 'Mishary Rashid Al-Afasy', style: 'Hafs an Asim' },
  { id: 'Abdul_Basit_Murattal_192kbps', name: 'Abdul Basit Abdul Samad', style: 'Murattal' },
  { id: 'Minshawy_Murattal_128kbps', name: 'Mohamed Siddiq Al-Minshawi', style: 'Murattal' },
  { id: 'Husary_128kbps', name: 'Mahmoud Khalil Al-Husary', style: 'Tajweed / Murattal' },
  { id: 'Abdurrahmaan_As-Sudais_192kbps', name: 'Abdur-Rahman As-Sudais', style: 'Haramain Recitation' },
  { id: 'Ghamadi_40kbps', name: 'Saad Al-Ghamdi', style: 'Murattal' },
];

const AudioPlayer = ({ surahNumber, ayahNumber }) => {
  const [selectedReciter, setSelectedReciter] = useState(RECITERS[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);

  // Generate EveryAyah CDN audio URL
  const getAudioUrl = (surah, ayah, reciterId) => {
    const paddedSurah = surah.toString().padStart(3, '0');
    const paddedAyah = ayah.toString().padStart(3, '0');
    return `https://www.everyayah.com/data/${reciterId}/${paddedSurah}${paddedAyah}.mp3`;
  };

  const audioUrl = getAudioUrl(surahNumber, ayahNumber, selectedReciter);

  // Format time from seconds to MM:SS
  const formatTime = (time) => {
    if (isNaN(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current) return;

    setLoading(true);
    setError(null);
    setIsPlaying(false);

    if (wavesurfer.current) {
      wavesurfer.current.destroy();
    }

    try {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#93c5fd',
        progressColor: '#2563eb',
        cursorColor: '#1d4ed8',
        barWidth: 3,
        barRadius: 3,
        cursorWidth: 2,
        height: 64,
        barGap: 3,
        normalize: true,
      });

      wavesurfer.current.load(audioUrl);

      wavesurfer.current.on('ready', () => {
        setLoading(false);
        setDuration(wavesurfer.current.getDuration());
        wavesurfer.current.setPlaybackRate(playbackRate);
      });

      wavesurfer.current.on('timeupdate', (time) => {
        setCurrentTime(time || wavesurfer.current.getCurrentTime());
      });

      wavesurfer.current.on('finish', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      wavesurfer.current.on('error', (err) => {
        console.error('WaveSurfer error:', err);
        setError('Reference audio unavailable from CDN');
        setLoading(false);
      });
    } catch (e) {
      console.error('Failed to create WaveSurfer:', e);
      setError('Could not initialize audio visualizer');
      setLoading(false);
    }

    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, [audioUrl, playbackRate]);

  // Update playback rate dynamically
  useEffect(() => {
    if (wavesurfer.current && !loading) {
      wavesurfer.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate, loading]);

  // Handle play/pause
  const togglePlayback = () => {
    if (!wavesurfer.current || loading || error) return;
    wavesurfer.current.playPause();
    setIsPlaying(wavesurfer.current.isPlaying());
  };

  // Change playback speed
  const changePlaybackRate = (rate) => {
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  };

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 w-full">
      {/* Top Controls: Reciter selector & speed */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Qari / Reciter:
          </span>
          <select
            value={selectedReciter}
            onChange={(e) => setSelectedReciter(e.target.value)}
            className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.style})
              </option>
            ))}
          </select>
        </div>

        {/* Speed and More options */}
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          {/* Speed Toggle Chips */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            {[0.75, 1.0, 1.25].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => changePlaybackRate(rate)}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                  playbackRate === rate
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Download button */}
          <a
            href={audioUrl}
            download={`Surah_${surahNumber}_Ayah_${ayahNumber}_${selectedReciter}.mp3`}
            target="_blank"
            rel="noopener noreferrer"
            title="Download verse audio MP3"
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <FaDownload className="w-3.5 h-3.5" />
          </a>

          {/* Horizontal More button */}
          <button
            type="button"
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            title="More audio options"
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <FiMoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Waveform visualizer */}
      <div
        ref={waveformRef}
        className="w-full h-16 mb-2 cursor-pointer bg-white rounded-lg p-1 border border-slate-200/60 shadow-xs"
      />

      {/* Bottom Bar: Play/Pause and Time */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-3">
          <button
            onClick={togglePlayback}
            disabled={loading || !!error}
            className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all active:scale-95"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <FaPause className="w-3.5 h-3.5" /> : <FaPlay className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          <span className="text-xs font-mono text-slate-600">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="text-xs text-slate-400">
          Surah {surahNumber}:{ayahNumber}
        </div>
      </div>

      {/* Feedback & Error states */}
      {loading && (
        <div className="mt-2 text-xs text-blue-600 font-medium animate-pulse">
          Loading authentic recitation audio...
        </div>
      )}

      {error && (
        <div className="mt-2 text-xs text-red-500 font-medium">
          {error}
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;