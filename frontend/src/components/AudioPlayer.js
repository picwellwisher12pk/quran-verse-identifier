import React, { useState, useRef, useEffect } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';

const RECITERS = [
  { id: 'Alafasy_128kbps', name: 'Mishary Rashid Al-Afasy' },
  { id: 'Abdul_Basit_Murattal_192kbps', name: 'Abdul Basit (Murattal)' },
  { id: 'Minshawy_Murattal_128kbps', name: 'Al-Minshawi (Murattal)' },
  { id: 'Husary_128kbps', name: 'Al-Husary (Murattal)' },
  { id: 'Abdurrahmaan_As-Sudais_192kbps', name: 'As-Sudais (Haramain)' },
  { id: 'Ghamadi_40kbps', name: 'Saad Al-Ghamdi' },
];

const AudioPlayer = ({ surahNumber, ayahNumber }) => {
  const [selectedReciter, setSelectedReciter] = useState(RECITERS[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef(null);

  const paddedSurah = (surahNumber || 1).toString().padStart(3, '0');
  const paddedAyah = (ayahNumber || 1).toString().padStart(3, '0');
  const audioUrl = `https://www.everyayah.com/data/${selectedReciter}/${paddedSurah}${paddedAyah}.mp3`;

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
  }, [audioUrl]);

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const formatTime = (time) => {
    if (isNaN(time) || time < 0) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pos * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-slate-50/90 border border-slate-200/60 rounded-xl p-2.5 sm:p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

      <div className="flex items-center space-x-2.5 w-full sm:w-auto flex-1">
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={isPlaying ? 'Pause reference recitation' : 'Play reference recitation'}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center shadow-2xs transition-transform active:scale-95 shrink-0 cursor-pointer"
        >
          {isPlaying ? <FaPause className="w-2.5 h-2.5" /> : <FaPlay className="w-2.5 h-2.5 ml-0.5" />}
        </button>

        {/* Progress Scrubber */}
        <div
          onClick={handleSeek}
          className="relative flex-1 h-2 bg-slate-200/80 rounded-full cursor-pointer overflow-hidden"
        >
          <div
            className="h-full bg-teal-600 rounded-full transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <span className="text-[11px] font-mono text-slate-500 shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center space-x-1.5 self-end sm:self-auto shrink-0">
        <select
          value={selectedReciter}
          onChange={(e) => setSelectedReciter(e.target.value)}
          className="text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
        >
          {RECITERS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default AudioPlayer;