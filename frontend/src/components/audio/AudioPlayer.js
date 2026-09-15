import React, { useRef, useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useWaveSurfer } from '../../hooks/useWaveSurfer';
import Visualizer from './Visualizer';
import Controls from './Controls';

const AudioPlayer = ({
  audioUrl,
  isRecording = false,
  analyser,
  className = '',
  onPlayPause: externalOnPlayPause,
  onSkip: externalOnSkip,
  onMute: externalOnMute,
  onVolumeChange: externalOnVolumeChange,
}) => {
  const waveformRef = useRef(null);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const {
    currentTime,
    duration,
    waveformReady,
    isPlaying,
    wavesurfer,
  } = useWaveSurfer(waveformRef, audioUrl, {
    interact: !isRecording,
    height: 100,
  });

  // Apply volume and muted state to WaveSurfer instance when ready
  useEffect(() => {
    if (wavesurfer && waveformReady) {
      try {
        wavesurfer.setVolume(isMuted ? 0 : volume);
        wavesurfer.setMuted(isMuted);
      } catch (e) {
        console.warn('Error configuring WaveSurfer volume:', e);
      }
    }
  }, [wavesurfer, waveformReady, volume, isMuted]);

  const handlePlayPause = useCallback(() => {
    if (!wavesurfer) return;
    try {
      wavesurfer.playPause();
      externalOnPlayPause?.();
    } catch (err) {
      console.error('Error toggling play/pause:', err);
    }
  }, [wavesurfer, externalOnPlayPause]);

  const handleSkip = useCallback((seconds) => {
    if (!wavesurfer) return;
    try {
      const cur = wavesurfer.getCurrentTime() || 0;
      const dur = wavesurfer.getDuration() || 0;
      const nextTime = Math.max(0, Math.min(dur || 9999, cur + seconds));
      wavesurfer.setTime(nextTime);
      externalOnSkip?.(seconds);
    } catch (err) {
      console.error('Error skipping audio:', err);
    }
  }, [wavesurfer, externalOnSkip]);

  const handleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (wavesurfer) {
      try {
        wavesurfer.setMuted(nextMuted);
      } catch (e) {
        console.warn('Error setting muted:', e);
      }
    }
    externalOnMute?.(nextMuted);
  }, [wavesurfer, isMuted, externalOnMute]);

  const handleVolumeChange = useCallback((newVolume) => {
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
    if (wavesurfer) {
      try {
        wavesurfer.setVolume(newVolume);
        if (newVolume > 0 && isMuted) {
          wavesurfer.setMuted(false);
        }
      } catch (e) {
        console.warn('Error setting volume:', e);
      }
    }
    externalOnVolumeChange?.(newVolume);
  }, [wavesurfer, isMuted, externalOnVolumeChange]);

  return (
    <div className={`space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {isRecording ? (
        <Visualizer 
          analyser={analyser} 
          isRecording={isRecording} 
          height={100}
        />
      ) : (
        <div ref={waveformRef} className="w-full cursor-pointer" />
      )}
      
      {!isRecording && (
        <Controls
          isPlaying={isPlaying}
          isRecording={isRecording}
          isReady={waveformReady}
          onPlayPause={handlePlayPause}
          onSkip={handleSkip}
          onMute={handleMute}
          isMuted={isMuted}
          onVolumeChange={handleVolumeChange}
          volume={volume}
          currentTime={currentTime}
          duration={duration}
        />
      )}
    </div>
  );
};

AudioPlayer.propTypes = {
  audioUrl: PropTypes.string,
  isRecording: PropTypes.bool,
  analyser: PropTypes.object,
  className: PropTypes.string,
  onPlayPause: PropTypes.func,
  onSkip: PropTypes.func,
  onMute: PropTypes.func,
  onVolumeChange: PropTypes.func,
};

export default AudioPlayer;
