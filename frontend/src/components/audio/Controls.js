import React from 'react';
import PropTypes from 'prop-types';
import { FiPlay, FiPause, FiVolume2, FiVolumeX } from 'react-icons/fi';

const Controls = ({
  isPlaying,
  isRecording = false,
  isReady,
  onPlayPause,
  onMute,
  isMuted,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-center space-x-4 py-2 ${className}`}>
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={onPlayPause}
        disabled={!isReady || isRecording}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          !isReady || isRecording
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-teal-600 hover:bg-teal-700 active:scale-95 text-white shadow-sm cursor-pointer'
        }`}
        title={isPlaying ? 'Pause' : 'Play'}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <FiPause className="w-5 h-5" />
        ) : (
          <FiPlay className="w-5 h-5 ml-0.5" />
        )}
      </button>

      {/* Volume Button (Mute/Unmute toggle) */}
      <button
        type="button"
        onClick={onMute}
        disabled={!isReady}
        className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
          isMuted
            ? 'bg-slate-100 border-slate-200 text-slate-400'
            : 'bg-white border-slate-200/80 text-teal-600 hover:bg-slate-50'
        } active:scale-95 cursor-pointer`}
        title={isMuted ? 'Unmute' : 'Mute'}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          <FiVolumeX className="w-4 h-4" />
        ) : (
          <FiVolume2 className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

Controls.propTypes = {
  isPlaying: PropTypes.bool.isRequired,
  isRecording: PropTypes.bool,
  isReady: PropTypes.bool.isRequired,
  onPlayPause: PropTypes.func.isRequired,
  onMute: PropTypes.func.isRequired,
  isMuted: PropTypes.bool.isRequired,
  className: PropTypes.string,
};

export default Controls;
