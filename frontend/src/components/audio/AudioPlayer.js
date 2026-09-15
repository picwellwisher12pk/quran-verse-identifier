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
  const [volume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const {
    waveformReady,
    isPlaying,
    wavesurfer,
  } = useWaveSurfer(waveformRef, audioUrl, {
    interact: !isRecording,
    height: 80,
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

  return (
    <div className={`w-full max-w-md mx-auto py-2 ${className}`}>
      {isRecording ? (
        <Visualizer 
          analyser={analyser} 
          isRecording={isRecording} 
          height={80}
        />
      ) : (
        <div ref={waveformRef} className="w-full cursor-pointer py-1" />
      )}
      
      {!isRecording && (
        <Controls
          isPlaying={isPlaying}
          isRecording={isRecording}
          isReady={waveformReady}
          onPlayPause={handlePlayPause}
          onMute={handleMute}
          isMuted={isMuted}
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
