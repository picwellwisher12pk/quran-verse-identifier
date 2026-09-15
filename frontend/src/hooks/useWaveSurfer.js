import { useState, useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

export const useWaveSurfer = (containerRef, audioUrl, options = {}) => {
  const [wavesurfer, setWavesurfer] = useState(null);
  const [waveformReady, setWaveformReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!containerRef.current || !audioUrl) {
      setWaveformReady(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    setWaveformReady(false);

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4f46e5',
      progressColor: '#818cf8',
      cursorColor: '#312e81',
      cursorWidth: 2,
      height: optionsRef.current.height || 100,
      barWidth: 2,
      barGap: 2,
      barRadius: 3,
      interact: optionsRef.current.interact !== false,
      url: audioUrl,
      normalize: true,
      ...optionsRef.current,
    });

    ws.on('ready', () => {
      setWaveformReady(true);
      setDuration(ws.getDuration() || 0);
    });

    ws.on('timeupdate', (time) => {
      setCurrentTime(time || ws.getCurrentTime() || 0);
    });

    ws.on('finish', () => {
      setCurrentTime(0);
    });

    ws.on('error', (err) => {
      console.error('WaveSurfer error:', err);
      setWaveformReady(false);
    });

    setWavesurfer(ws);

    return () => {
      try {
        ws.destroy();
      } catch (e) {
        console.warn('Error destroying WaveSurfer instance:', e);
      }
      setWavesurfer(null);
      setWaveformReady(false);
    };
  }, [containerRef, audioUrl]);

  return {
    wavesurfer,
    waveformReady,
    currentTime,
    duration,
  };
};

export default useWaveSurfer;
