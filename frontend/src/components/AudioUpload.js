import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import AudioPlayer from './audio/AudioPlayer';
import Visualizer from './audio/Visualizer';
import { apiService } from '../services/api';
import { FiMic, FiSearch, FiSquare, FiUploadCloud, FiRotateCcw } from 'react-icons/fi';

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

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
        // Auto-restart if user is still actively recording
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

    // Trigger visual unwrap animation
    setIsUnwrapping(true);

    // Call Speech Recognition immediately in direct user tap handler for mobile permissions
    initAndStartSTT();

    // Start recording after brief transition so audio hardware is ready
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

  // Discard current audio & reset
  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setCurrentAudioUrl('');
    setLiveTranscript('');
    setIsUnwrapping(false);
  }, []);

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
      className="relative w-full max-w-2xl mx-auto transition-all"
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
          <FiUploadCloud className="w-16 h-16 mb-3 animate-bounce" />
          <h3 className="text-xl font-bold">Drop Your Audio Recording Here</h3>
          <p className="text-sm text-teal-100 mt-1">Supports MP3, WAV, WebM, M4A, FLAC, OGG</p>
        </div>
      )}

      {/* ============================================================ */}
      {/* STATE 1: RECORDING OR UNWRAPPING IN PROGRESS                 */}
      {/* ============================================================ */}
      {isRecording || isUnwrapping ? (
        <div className="w-full space-y-6 text-center py-4 sm:py-6">
          {/* Recording Status & Timer */}
          <div className="flex items-center justify-center space-x-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
            </span>
            <span className="text-sm font-semibold text-red-600 tracking-wide uppercase">
              {isUnwrapping ? 'Starting Recitation...' : 'Recording Recitation'}
            </span>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              {formatTime(recordingSeconds)}
            </span>
          </div>

          {/* Morphing Waveform Container */}
          <div className="relative py-2 w-full max-w-xl mx-auto flex items-center justify-center min-h-[90px]">
            {isUnwrapping ? (
              // The circular border unrolls horizontally into a straight line
              <div className="w-full h-24 flex items-center justify-center">
                <div className="hollow-record-btn animate-morph-line" />
              </div>
            ) : (
              // The live oscilloscope waveform with exact same 3px teal stroke
              <Visualizer
                analyser={analyserRef.current}
                isRecording={isRecording}
                height={90}
              />
            )}
          </div>

          {/* Live Arabic Speech Recognition Preview */}
          {liveTranscript && (
            <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-4 text-center max-w-lg mx-auto">
              <span className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider block mb-1">
                Live Speech Recognition
              </span>
              <p dir="rtl" className="font-quran text-2xl text-slate-900 leading-relaxed px-2">
                {liveTranscript}
              </p>
            </div>
          )}

          {/* Prominent Stop Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleStopRecording}
              className="inline-flex items-center space-x-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-8 rounded-full shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer"
            >
              <FiSquare className="w-4 h-4 fill-current" />
              <span>Stop Recording</span>
            </button>
            <p className="text-xs text-slate-400 mt-2">
              Click when you have finished reciting the verse
            </p>
          </div>
        </div>
      ) : hasAudioReady ? (
        /* ============================================================ */
        /* STATE 2: AUDIO READY (PREVIEW & IDENTIFY)                    */
        /* ============================================================ */
        <div className="space-y-6 max-w-xl mx-auto">
          {/* Audio Source Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 bg-slate-100 py-1.5 px-3 rounded-full">
              <span>{selectedFile?.name?.startsWith('recording_') ? '🎙️ Microphone Recitation' : '🎵 Audio File'}</span>
              {selectedFile?.size && (
                <span className="text-slate-400">• {formatFileSize(selectedFile.size)}</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleReset}
              disabled={uploading}
              className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-red-600 transition-colors py-1 px-2 rounded-md hover:bg-red-50 cursor-pointer"
              title="Discard this recording"
            >
              <FiRotateCcw className="w-3.5 h-3.5" />
              <span>Discard</span>
            </button>
          </div>

          {/* Captured Arabic Script Banner */}
          {liveTranscript && (
            <div className="bg-teal-50/70 border border-teal-200 rounded-2xl p-4 text-center">
              <span className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider block mb-1">
                Captured Arabic Recitation
              </span>
              <p dir="rtl" className="font-quran text-2xl text-slate-900 leading-relaxed px-2">
                {liveTranscript}
              </p>
            </div>
          )}

          {/* Audio Player with WaveSurfer */}
          <AudioPlayer audioUrl={currentAudioUrl} />

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleAudioUpload}
              disabled={uploading}
              className="w-full sm:flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 active:scale-98 text-base cursor-pointer"
            >
              <FiSearch className="w-5 h-5" />
              <span>Identify Recited Verse</span>
            </button>

            <button
              type="button"
              onClick={handleStartRecording}
              disabled={uploading}
              className="w-full sm:w-auto text-slate-600 hover:text-slate-900 hover:bg-slate-100 py-3.5 px-5 rounded-xl transition-all text-sm font-medium border border-slate-200 cursor-pointer"
            >
              Recite Again
            </button>
          </div>

          {/* Drag or choose alternative hint */}
          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">
              Want to use a different audio file?{' '}
              <button
                type="button"
                onClick={handleBrowseClick}
                className="text-teal-600 hover:underline font-medium cursor-pointer"
              >
                Drop or browse a new file
              </button>
            </p>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* STATE 3: IDLE STATE (EXPLICIT 3PX HOLLOW TEAL BUTTON)        */
        /* ============================================================ */
        <div className="flex flex-col items-center justify-center text-center space-y-6 py-6 sm:py-10">
          {/* Main Record Button: Hollow with explicit 3px solid teal border */}
          <div className="relative flex items-center justify-center">
            <button
              type="button"
              onClick={handleStartRecording}
              aria-label="Start recording Quran recitation"
              className="hollow-record-btn"
            >
              <FiMic className="w-12 h-12 mb-2 text-teal-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Tap to Recite
              </span>
            </button>
          </div>

          <p className="text-sm font-medium text-slate-600">
            Click the button and recite any verse from the Quran
          </p>

          {/* Microphone Selector Dropdown */}
          <div className="inline-flex items-center space-x-2 bg-white/80 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
            <FiMic className="w-4 h-4 text-teal-600 shrink-0" />
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-transparent focus:outline-none cursor-pointer border-none p-0 pr-2"
            >
              {audioDevices.map((device, idx) => (
                <option key={device.deviceId || idx} value={device.deviceId}>
                  {device.label || `Microphone ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Minimal Audio File Drop Link */}
          <div className="pt-2">
            <p className="text-xs text-slate-400">
              Or{' '}
              <button
                type="button"
                onClick={handleBrowseClick}
                className="text-teal-600 hover:underline font-semibold cursor-pointer"
              >
                browse audio file
              </button>{' '}
              to upload (MP3, WAV, WebM)
            </p>
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
