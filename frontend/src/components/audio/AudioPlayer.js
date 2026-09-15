import React, { useRef, useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useWaveSurfer } from '../../hooks/useWaveSurfer';
import Visualizer from './Visualizer';
import Controls from './Controls';

const AudioPlayer = ({
  audioUrl,
  isRecording = false,
  analyser,
  onPlayPause,
  onSkip,
  onMute,
  isMuted,
  onVolumeChange,
  volume,
  isPlaying: externalIsPlaying,
  className = '',
}) => {
  const waveformRef = useRef(null);
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const isPlaying = typeof externalIsPlaying !== 'undefined' ? externalIsPlaying : internalIsPlaying;
  
  const {
    currentTime,
    duration,
    waveformReady,
    wavesurfer
  } = useWaveSurfer(waveformRef, audioUrl, {
    interact: !isRecording,
    height: 120,
  });

  // Sync play/pause state with external control
  useEffect(() => {
    if (!wavesurfer) return;
    
    if (isPlaying && !wavesurfer.isPlaying()) {
      wavesurfer.play().catch(console.error);
    } else if (!isPlaying && wavesurfer.isPlaying()) {
      wavesurfer.pause();
    }
  }, [isPlaying, wavesurfer]);

  const handlePlayPause = useCallback(() => {
    if (onPlayPause) {
      onPlayPause();
    } else {
      setInternalIsPlaying(prev => !prev);
    }
  }, [onPlayPause]);

  const handleSkip = useCallback((seconds) => {
    if (onSkip) {
      onSkip(seconds);
    }
  }, [onSkip]);

  const handleMute = useCallback(() => {
    if (onMute) {
      onMute();
    }
  }, [onMute]);

  const handleVolumeChange = useCallback((newVolume) => {
    if (onVolumeChange) {
      onVolumeChange(newVolume);
    }
  }, [onVolumeChange]);

  return (
    <div className={`space-y-4 ${className}`}>
      {isRecording ? (
        <Visualizer 
          analyser={analyser} 
          isRecording={isRecording} 
          height={120}
        />
      ) : (
        <div ref={waveformRef} className="w-full" />
      )}
      
      <Controls
        isPlaying={isPlaying}
        isRecording={isRecording}
        isReady={waveformReady && !isRecording}
        onPlayPause={handlePlayPause}
        onSkip={handleSkip}
        onMute={handleMute}
        isMuted={isMuted}
        onVolumeChange={handleVolumeChange}
        volume={volume}
        currentTime={currentTime}
        duration={duration}
      />
    </div>
  );
};

AudioPlayer.propTypes = {
  audioUrl: PropTypes.string,
  isRecording: PropTypes.bool,
  analyser: PropTypes.object,
  onPlayPause: PropTypes.func,
  onSkip: PropTypes.func,
  onMute: PropTypes.func,
  isMuted: PropTypes.bool,
  onVolumeChange: PropTypes.func,
  volume: PropTypes.number,
  isPlaying: PropTypes.bool,
  className: PropTypes.string,
};

export default AudioPlayer;
