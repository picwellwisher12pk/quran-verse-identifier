import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import AudioPlayer from './audio/AudioPlayer';
import Visualizer from './audio/Visualizer';
import { apiService } from '../services/api';
import { FiMic, FiSearch, FiSquare, FiUploadCloud } from 'react-icons/fi';

const AudioUpload = ({ onUploadStart, onUploadProgress, onUploadSuccess, onUploadError }) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Animation unwrap state
  const [isUnwrapping, setIsUnwrapping] = useState(false);

  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Audio recorder hook
  const {
    isRecording,
    error: recordingError,
    startRecording,
    stopRecording,
    cleanup: cleanupRecorder,
    analyserRef,
    audioDevices,
    selectedDeviceId,
    setSelectedDeviceId,
  } = useAudioRecorder({
    onRecordingComplete: ({ file, url }) => {
      setSelectedFile(file);
      setCurrentAudioUrl(url);
    },
  });

  // Recording timer
  useEffect(() => {
    let timer;
    if (isRecording) {
      setRecordingSeconds(0);
      timer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining.toString().padStart(2, '0')}`;
  };


  // Helper to start Speech Recognition on both Desktop and Mobile
  const initAndStartSTT = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[STT] SpeechRecognition not available in this browser environment.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-SA';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
        if (text.trim()) {
          setLiveTranscript(text);
        }
      };

      recognition.onerror = (err) => {
        if (err.error === 'no-speech') return;
        console.warn('[STT] Error:', err.error);
      };

      recognition.onend = () => {
        if (isRecording) {
          try { recognition.start(); } catch (e) {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('[STT] Could not start speech recognition:', err);
    }
  }, [isRecording]);

  // Click handler: Triggers smooth 400ms unwrap animation, then starts recording
  const handleStartRecording = useCallback(async () => {
    setSelectedFile(null);
    setCurrentAudioUrl('');
    setLiveTranscript('');

    setIsUnwrapping(true);
    initAndStartSTT();

    setTimeout(async () => {
      try {
        await startRecording();
      } catch (err) {
        console.error('Recording start failed:', err);
      } finally {
        setIsUnwrapping(false);
      }
    }, 420);
  }, [startRecording, initAndStartSTT]);

  // Stop recording
  const handleStopRecording = useCallback(() => {
    stopRecording();
    setIsUnwrapping(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  }, [stopRecording]);

  // Handle file selection / drop
  const handleFileSelect = useCallback((file) => {
    if (!file) return;

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|webm|m4a|ogg|aac|flac)$/i)) {
      onUploadError?.(new Error('Please select a valid audio file (MP3, WAV, WebM, M4A).'));
      return;
    }

    setSelectedFile(file);
    setCurrentAudioUrl(URL.createObjectURL(file));
    setLiveTranscript('');
  }, [onUploadError]);

  const handleBrowseClick = () => {
    if (isRecording || uploading) return;
    fileInputRef.current?.click();
  };

  // Drag & drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isRecording || uploading) return;
    if (!isDragging) setIsDragging(true);
  }, [isRecording, uploading, isDragging]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isRecording || uploading) return;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [isRecording, uploading, handleFileSelect]);

  // Handle audio identification upload
  const handleAudioUpload = useCallback(async () => {
    if (!selectedFile && !liveTranscript.trim()) return;

    try {
      setUploading(true);
      onUploadStart?.({
        type: 'audio',
        fileName: selectedFile?.name || 'Microphone Recitation',
        fileSize: selectedFile?.size,
        transcript: liveTranscript.trim(),
      });

      const response = await apiService.identifyVerse(
        selectedFile,
        (percentCompleted) => {
          onUploadProgress?.(percentCompleted);
        },
        liveTranscript
      );

      setUploading(false);
      onUploadSuccess?.(response, selectedFile);
    } catch (error) {
      if (error?.message === 'Request was canceled' || error?.message?.includes('canceled')) {
        setUploading(false);
        return;
      }
      console.error('Upload error:', error);
      setUploading(false);
      onUploadError?.(error);
    }
  }, [selectedFile, liveTranscript, onUploadStart, onUploadProgress, onUploadSuccess, onUploadError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRecorder();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, [cleanupRecorder]);

  // Handle recorder error
  useEffect(() => {
    if (recordingError) {
      setIsUnwrapping(false);
      onUploadError?.(recordingError);
    }
  }, [recordingError, onUploadError]);

  const hasAudioReady = Boolean(selectedFile || currentAudioUrl);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative w-full max-w-xl mx-auto transition-all"
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.webm,.m4a,.ogg,.aac,.flac"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleFileSelect(e.target.files[0]);
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Dragging Overlay */}
      {isDragging && !isRecording && !uploading && (
        <div className="absolute inset-0 z-30 bg-teal-600/90 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in pointer-events-none">
          <FiUploadCloud className="w-14 h-14 mb-2 animate-bounce" />
          <h3 className="text-lg font-bold">Drop Audio File Here</h3>
        </div>
      )}

      {/* ============================================================ */}
      {/* STATE 1: RECORDING OR UNWRAPPING IN PROGRESS                 */}
      {/* ============================================================ */}
      {isRecording || isUnwrapping ? (
        <div className="w-full space-y-5 text-center py-2 sm:py-4">
          {/* Recording Status & Timer */}
          <div className="flex items-center justify-center space-x-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
            </span>
            <span className="text-xs sm:text-sm font-semibold text-red-600 tracking-wide uppercase">
              {isUnwrapping ? 'Starting...' : 'Listening'}
            </span>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              {formatTime(recordingSeconds)}
            </span>
          </div>

          {/* Morphing Waveform Container */}
          <div className="relative py-2 w-full max-w-lg mx-auto flex items-center justify-center min-h-[80px]">
            {isUnwrapping ? (
              <div className="w-full h-24 flex items-center justify-center">
                <div className="hollow-record-btn animate-morph-line" />
              </div>
            ) : (
              <Visualizer
                analyser={analyserRef.current}
                isRecording={isRecording}
                height={80}
              />
            )}
          </div>

          {/* Live Arabic Speech Recognition Preview */}
          {liveTranscript && (
            <div className="bg-teal-50/80 border border-teal-200/80 rounded-2xl p-3.5 text-center max-w-md mx-auto shadow-2xs">
              <span className="text-[10px] font-semibold text-teal-700 uppercase tracking-wider block mb-1">
                Detected Recitation
              </span>
              <p dir="rtl" className="font-quran text-xl sm:text-2xl text-slate-900 leading-relaxed px-1">
                {liveTranscript}
              </p>
            </div>
          )}

          {/* Prominent Stop Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleStopRecording}
              className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-8 rounded-full shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer text-sm"
            >
              <FiSquare className="w-4 h-4 fill-current" />
              <span>Stop & Check</span>
            </button>
          </div>
        </div>
      ) : hasAudioReady ? (
        /* ============================================================ */
        /* STATE 2: AUDIO READY (MINIMAL RECORDED WAVE & CONTROLS)      */
        /* ============================================================ */
        <div className="space-y-4 max-w-md mx-auto text-center py-2">
          {/* Generated Arabic Recitation Text if detected */}
          {liveTranscript && (
            <div className="py-2 px-3 animate-fade-in">
              <p dir="rtl" className="font-quran text-2xl sm:text-3xl text-slate-900 leading-relaxed tracking-wide">
                {liveTranscript}
              </p>
            </div>
          )}

          {/* Audio Player: Recorded Wave Graphics + Play/Pause & Volume */}
          <AudioPlayer audioUrl={currentAudioUrl} />

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleAudioUpload}
              disabled={uploading}
              className="w-full sm:w-auto min-w-[200px] bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-semibold py-3 px-6 rounded-full transition-all shadow-sm flex items-center justify-center space-x-2 text-sm cursor-pointer"
            >
              <FiSearch className="w-4 h-4" />
              <span>Identify Verse</span>
            </button>

            <button
              type="button"
              onClick={handleStartRecording}
              disabled={uploading}
              className="text-slate-500 hover:text-slate-800 text-xs sm:text-sm font-medium py-2 px-3 transition-colors cursor-pointer"
            >
              Recite Again
            </button>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* STATE 3: IDLE STATE (MOBILE-FIRST CLEAN HERO)               */
        /* ============================================================ */
        <div className="flex flex-col items-center justify-center text-center space-y-5 py-4 sm:py-8">
          {/* Main Record Button: Hollow with explicit 3px solid teal border */}
          <div className="relative flex items-center justify-center">
            <button
              type="button"
              onClick={handleStartRecording}
              aria-label="Start recording Quran recitation"
              className="hollow-record-btn"
            >
              <FiMic className="w-10 h-10 sm:w-12 sm:h-12 mb-1.5 text-teal-600" />
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-800">
                Tap to Recite
              </span>
            </button>
          </div>

          {/* Microphone Selector Dropdown (Subtle & compact) */}
          <div className="inline-flex items-center space-x-1.5 bg-white border border-slate-200/80 rounded-full px-3 py-1 shadow-2xs">
            <FiMic className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="text-[11px] sm:text-xs font-medium text-slate-700 bg-transparent focus:outline-none cursor-pointer border-none p-0 pr-1 max-w-[200px] truncate"
            >
              {audioDevices.map((device, idx) => (
                <option key={device.deviceId || idx} value={device.deviceId}>
                  {device.label || `Microphone ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Minimal Audio File Drop Link */}
          <div>
            <button
              type="button"
              onClick={handleBrowseClick}
              className="text-[11px] sm:text-xs text-slate-400 hover:text-teal-600 transition-colors cursor-pointer"
            >
              or upload audio file
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

AudioUpload.propTypes = {
  onUploadStart: PropTypes.func,
  onUploadProgress: PropTypes.func,
  onUploadSuccess: PropTypes.func,
  onUploadError: PropTypes.func,
};

export default AudioUpload;
