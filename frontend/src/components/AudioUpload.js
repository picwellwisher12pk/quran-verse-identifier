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
    ensureMicrophonePermissions,
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

  // Initialize Speech Recognition API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ar-SA';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          let current = '';
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript;
          }
          setLiveTranscript(current);
        };

        recognition.onerror = (err) => {
          console.warn('Speech recognition warning:', err.error);
        };

        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('Failed to setup speech recognition:', e);
      }
    }
  }, []);

  // Start recording
  const handleStartRecording = useCallback(() => {
    setSelectedFile(null);
    setCurrentAudioUrl('');
    setLiveTranscript('');
    startRecording();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Recognition already active or failed:', e);
      }
    }
  }, [startRecording]);

  // Stop recording
  const handleStopRecording = useCallback(() => {
    stopRecording();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
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
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [cleanupRecorder]);

  // Handle recorder error
  useEffect(() => {
    if (recordingError) {
      onUploadError?.(recordingError);
    }
  }, [recordingError, onUploadError]);

  const hasAudioReady = Boolean(currentAudioUrl && !isRecording);

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full max-w-2xl mx-auto rounded-3xl transition-all ${
        isDragging && !isRecording && !uploading
          ? 'ring-4 ring-blue-400 ring-offset-4 bg-blue-50/60'
          : ''
      }`}
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
        <div className="absolute inset-0 z-30 bg-blue-600/90 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in pointer-events-none">
          <FiUploadCloud className="w-16 h-16 mb-3 animate-bounce" />
          <h3 className="text-xl font-bold">Drop Your Audio Recording Here</h3>
          <p className="text-sm text-blue-100 mt-1">Supports MP3, WAV, WebM, M4A, FLAC, OGG</p>
        </div>
      )}

      {/* ============================================================ */}
      {/* STATE 1: RECORDING IN PROGRESS                                */}
      {/* ============================================================ */}
      {isRecording ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8 space-y-6 text-center">
          {/* Recording Timer Header */}
          <div className="flex items-center justify-center space-x-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
            </span>
            <span className="text-sm font-semibold text-red-600 tracking-wide uppercase">
              Recording Recitation
            </span>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              {formatTime(recordingSeconds)}
            </span>
          </div>

          {/* Morphing Waveform Visualizer Line */}
          <div className="py-2">
            <Visualizer
              analyser={analyserRef.current}
              isRecording={isRecording}
              height={90}
            />
          </div>

          {/* Live Arabic Transcript */}
          {liveTranscript && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-center">
              <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block mb-1">
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
              className="inline-flex items-center space-x-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 px-8 rounded-full shadow-md hover:shadow-lg transition-all transform active:scale-95"
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
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8 space-y-6">
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
              className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-red-600 transition-colors py-1 px-2 rounded-md hover:bg-red-50"
              title="Discard this recording"
            >
              <FiRotateCcw className="w-3.5 h-3.5" />
              <span>Discard</span>
            </button>
          </div>

          {/* Captured Arabic Script Banner (if live speech was captured) */}
          {liveTranscript && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-center">
              <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block mb-1">
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
              className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 active:scale-98 text-base cursor-pointer"
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
                className="text-blue-600 hover:underline font-medium cursor-pointer"
              >
                Drop or browse a new file
              </button>
            </p>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* STATE 3: IDLE STATE (HERO BIG RECORD BUTTON + DROP AREA)     */
        /* ============================================================ */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-6">
          {/* Big Record Button */}
          <button
            type="button"
            onClick={handleStartRecording}
            className="group relative flex flex-col items-center justify-center w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            <span className="absolute -inset-1.5 rounded-full bg-blue-400 opacity-25 group-hover:opacity-60 blur-md transition-opacity" />
            <div className="relative z-10 flex flex-col items-center">
              <FiMic className="w-14 h-14 sm:w-16 sm:h-16 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                Tap to Recite
              </span>
            </div>
          </button>

          <p className="text-sm font-semibold text-slate-800">
            Click the button and recite any verse from the Quran
          </p>

          {/* Small Microphone Selector Dropdown */}
          <div className="inline-flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shadow-2xs">
            <FiMic className="w-4 h-4 text-blue-600 shrink-0" />
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              onClick={ensureMicrophonePermissions}
              disabled={isRecording || uploading}
              className="text-xs font-medium text-slate-700 bg-transparent border-0 focus:ring-0 cursor-pointer pr-4 py-0.5 outline-none max-w-[200px] sm:max-w-[260px] truncate"
            >
              <option value="">Default Microphone</option>
              {audioDevices.map((mic, idx) => (
                <option key={mic.deviceId || idx} value={mic.deviceId}>
                  {mic.label || `Microphone ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Drag and drop prompt */}
          <div className="pt-2 border-t border-slate-100 w-full flex items-center justify-center space-x-1.5 text-xs text-slate-500">
            <FiUploadCloud className="w-4 h-4 text-slate-400" />
            <span>or drag & drop an audio recording here •</span>
            <button
              type="button"
              onClick={handleBrowseClick}
              className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2 cursor-pointer"
            >
              choose file
            </button>
          </div>
        </div>
      )}

      {/* Recording Error */}
      {recordingError && (
        <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg text-sm">
          {recordingError}
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