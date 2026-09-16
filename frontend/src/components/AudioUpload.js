import React, { useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import AudioPlayer from './audio/AudioPlayer';
import Visualizer from './audio/Visualizer';
import { apiService } from '../services/api';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import { FiMic, FiSearch, FiSquare, FiUploadCloud } from 'react-icons/fi';

const AudioUpload = ({ onUploadStart, onUploadProgress, onUploadSuccess, onUploadError }) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [reciteMode, setReciteMode] = useState('stt'); // 'stt' (Option 1: Live STT) | 'recorder' (Option 2: Audio File)
  const [isSTTListening, setIsSTTListening] = useState(false);

  // Animation unwrap state
  const [isUnwrapping, setIsUnwrapping] = useState(false);

  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const shouldRecognizeRef = useRef(false);
  const restartTimerRef = useRef(null);
  const persistedTranscriptRef = useRef('');
  const currentSessionTextRef = useRef('');

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

  // Combined recording state
  const isActivelyRecording = isRecording || isSTTListening;

  // Recording timer
  useEffect(() => {
    let timer;
    if (isActivelyRecording) {
      setRecordingSeconds(0);
      timer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isActivelyRecording]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining.toString().padStart(2, '0')}`;
  };

  // Smart N-Gram cleaner that collapses repeated words and phrases from mobile STT restarts
  const cleanTranscript = (text) => {
    if (!text) return '';
    let words = text.trim().split(/\s+/);
    let res = [];
    // 1. Remove single-word consecutive repetitions: e.g. "قل قل" -> "قل"
    for (let i = 0; i < words.length; i++) {
      if (i === 0 || words[i] !== words[i - 1]) {
        res.push(words[i]);
      }
    }
    // 2. Remove multi-word consecutive phrase repetitions (from 6 words down to 2)
    // e.g. "قل هو قل هو" -> "قل هو", "قل هو الله قل هو الله" -> "قل هو الله"
    for (let n = 6; n >= 2; n--) {
      let changed = true;
      while (changed) {
        changed = false;
        for (let i = 0; i <= res.length - 2 * n; i++) {
          const p1 = res.slice(i, i + n).join(' ');
          const p2 = res.slice(i + n, i + 2 * n).join(' ');
          if (p1 === p2) {
            res.splice(i + n, n);
            changed = true;
            break;
          }
        }
      }
    }
    return res.join(' ');
  };

  const mergeTranscripts = (existing, incoming) => {
    const t1 = (existing || '').trim();
    const t2 = (incoming || '').trim();
    if (!t1) return cleanTranscript(t2);
    if (!t2) return cleanTranscript(t1);

    if (t2.startsWith(t1)) return cleanTranscript(t2);
    if (t1.startsWith(t2)) return cleanTranscript(t1);

    const words1 = t1.split(/\s+/);
    const words2 = t2.split(/\s+/);

    const maxOverlap = Math.min(words1.length, words2.length);
    for (let len = maxOverlap; len > 0; len--) {
      const suffix1 = words1.slice(words1.length - len).join(' ');
      const prefix2 = words2.slice(0, len).join(' ');
      if (suffix1 === prefix2) {
        return cleanTranscript([...words1, ...words2.slice(len)].join(' '));
      }
    }

    return cleanTranscript(`${t1} ${t2}`);
  };

  // Helper to start Speech Recognition on both Desktop and Mobile with auto-restart
  const startSTT = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      logger.warn(LOG_CATEGORIES.STT, 'SpeechRecognition is not supported in this browser. Live transcript will not be available.');
      return;
    }

    if (!shouldRecognizeRef.current) {
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }

      logger.info(LOG_CATEGORIES.STT, 'Initializing browser SpeechRecognition', {
        lang: 'ar-SA',
        continuous: true,
        interimResults: true,
      });

      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-SA';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        logger.info(LOG_CATEGORIES.STT, 'SpeechRecognition started listening for Arabic recitation');
      };

      recognition.onspeechstart = () => {
        logger.debug(LOG_CATEGORIES.STT, 'Speech audio detected by speech recognizer');
      };

      recognition.onresult = (event) => {
        let sessionFinal = '';
        let sessionInterim = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            sessionFinal += res[0].transcript + ' ';
          } else {
            sessionInterim += res[0].transcript;
          }
        }

        const sessionText = (sessionFinal + sessionInterim).trim();
        currentSessionTextRef.current = sessionText;

        const combined = mergeTranscripts(persistedTranscriptRef.current, sessionText);

        if (combined) {
          const lastResult = event.results[event.results.length - 1];
          logger.info(LOG_CATEGORIES.STT, `Transcript received: "${combined}"`, {
            isFinal: lastResult?.isFinal,
            confidence: lastResult?.[0]?.confidence,
          });
          setLiveTranscript(combined);
        }
      };

      recognition.onerror = (err) => {
        if (err.error === 'no-speech') {
          logger.debug(LOG_CATEGORIES.STT, 'SpeechRecognition no-speech timeout (normal on mobile devices)');
          return;
        }
        if (err.error === 'aborted') {
          logger.debug(LOG_CATEGORIES.STT, 'SpeechRecognition aborted');
          return;
        }
        logger.warn(LOG_CATEGORIES.STT, `SpeechRecognition error [${err.error}]`, {
          error: err.error,
          message: err.message,
        });
        if (err.error === 'not-allowed') {
          shouldRecognizeRef.current = false;
        }
      };

      recognition.onend = () => {
        // Persist recognized text from this session using smart merge
        if (currentSessionTextRef.current) {
          persistedTranscriptRef.current = mergeTranscripts(
            persistedTranscriptRef.current,
            currentSessionTextRef.current
          );
          currentSessionTextRef.current = '';
        }

        const willRestart = shouldRecognizeRef.current;
        logger.info(LOG_CATEGORIES.STT, `SpeechRecognition ended${willRestart ? ' (auto-restarting on mobile)' : ''}`);

        if (willRestart) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          // 150ms delay allows mobile browser speech subsystem to complete teardown before restarting
          restartTimerRef.current = setTimeout(() => {
            if (shouldRecognizeRef.current) {
              logger.info(LOG_CATEGORIES.STT, 'Auto-restarting SpeechRecognition for recitation session');
              startSTT();
            }
          }, 150);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      logger.error(LOG_CATEGORIES.STT, 'Could not start browser speech recognition', err);
      if (shouldRecognizeRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          if (shouldRecognizeRef.current) {
            startSTT();
          }
        }, 300);
      }
    }
  }, []);

  // Click handler: Triggers smooth 400ms unwrap animation, then starts recording
  const handleStartRecording = useCallback(async () => {
    setSelectedFile(null);
    setCurrentAudioUrl('');
    setLiveTranscript('');
    persistedTranscriptRef.current = '';
    currentSessionTextRef.current = '';

    setIsUnwrapping(true);

    // Start Speech Recognition across both modes so Arabic text is always transcribed
    shouldRecognizeRef.current = true;
    setIsSTTListening(true);
    startSTT();

    if (reciteMode === 'stt') {
      // Option 1: Live STT (exclusive speech recognition, lightweight)
      setTimeout(() => {
        setIsUnwrapping(false);
      }, 350);
    } else {
      // Option 2: Record Audio (captures audio file via MediaRecorder + parallel STT transcription)
      setTimeout(async () => {
        try {
          await startRecording();
        } catch (err) {
          console.error('Recording start failed:', err);
        } finally {
          setIsUnwrapping(false);
        }
      }, 420);
    }
  }, [reciteMode, startRecording, startSTT]);

  // Stop recording
  const handleStopRecording = useCallback(() => {
    setIsSTTListening(false);
    shouldRecognizeRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (currentSessionTextRef.current) {
      persistedTranscriptRef.current = mergeTranscripts(
        persistedTranscriptRef.current,
        currentSessionTextRef.current
      );
      currentSessionTextRef.current = '';
    }

    if (persistedTranscriptRef.current) {
      setLiveTranscript(cleanTranscript(persistedTranscriptRef.current));
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (isRecording) {
      stopRecording();
    }
    setIsUnwrapping(false);
  }, [isRecording, stopRecording]);

  // Handle file selection / drop
  const handleFileSelect = useCallback((file) => {
    if (!file) return;

    persistedTranscriptRef.current = '';
    currentSessionTextRef.current = '';

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|webm|m4a|ogg|aac|flac)$/i)) {
      const err = new Error('Please select a valid audio file (MP3, WAV, WebM, M4A).');
      logger.warn(LOG_CATEGORIES.UI, 'Invalid file type rejected', {
        fileName: file.name,
        fileType: file.type,
      });
      onUploadError?.(err);
      return;
    }

    logger.info(LOG_CATEGORIES.UI, 'Audio file selected for identification', {
      fileName: file.name,
      fileSize: file.size,
      fileSizeBytes: `${(file.size / 1024).toFixed(1)} KB`,
      fileType: file.type,
    });

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
      logger.info(LOG_CATEGORIES.UI, 'File dropped onto upload zone', {
        fileName: files[0].name,
        fileSize: files[0].size,
      });
      handleFileSelect(files[0]);
    }
  }, [isRecording, uploading, handleFileSelect]);

  // Handle audio identification upload
  const handleAudioUpload = useCallback(async () => {
    if (!selectedFile && !liveTranscript.trim()) {
      logger.warn(LOG_CATEGORIES.UI, 'handleAudioUpload aborted: No audio file and no transcript present');
      return;
    }

    try {
      setUploading(true);
      const uploadMetadata = {
        type: 'audio',
        fileName: selectedFile?.name || 'Microphone Recitation',
        fileSize: selectedFile?.size,
        hasAudioFile: Boolean(selectedFile),
        transcript: liveTranscript.trim(),
      };

      logger.info(LOG_CATEGORIES.UI, 'Starting verse identification process', uploadMetadata);
      onUploadStart?.(uploadMetadata);

      const response = await apiService.identifyVerse(
        selectedFile,
        (percentCompleted) => {
          logger.debug(LOG_CATEGORIES.API, `Upload progress: ${percentCompleted}%`);
          onUploadProgress?.(percentCompleted);
        },
        liveTranscript
      );

      logger.info(LOG_CATEGORIES.UI, 'Identification search returned response', {
        success: response?.success,
        matchesCount: response?.matches?.length || 0,
        processingTime: response?.processing_time,
        topCandidate: response?.matches?.[0]
          ? {
              surah: `${response.matches[0].verse?.surah_name_english} (${response.matches[0].verse?.surah_number}:${response.matches[0].verse?.ayah_number})`,
              confidence: response.matches[0].confidence,
              source: response.matches[0].recognition_source,
            }
          : null,
      });

      setUploading(false);
      onUploadSuccess?.(response, selectedFile);
    } catch (error) {
      if (error?.message === 'Request was canceled' || error?.message?.includes('canceled')) {
        logger.info(LOG_CATEGORIES.API, 'Verse identification request was canceled by user');
        setUploading(false);
        return;
      }
      logger.error(LOG_CATEGORIES.UI, 'Verse identification request failed: ' + (error.message || 'Unknown error'), error);
      setUploading(false);
      onUploadError?.(error);
    }
  }, [selectedFile, liveTranscript, onUploadStart, onUploadProgress, onUploadSuccess, onUploadError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldRecognizeRef.current = false;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      cleanupRecorder();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, [cleanupRecorder]);

  // Listen for global reset (e.g. user clicked header logo)
  useEffect(() => {
    const handleAppReset = () => {
      logger.info(LOG_CATEGORIES.UI, 'AudioUpload received app:reset -> Resetting recorder and STT to idle');
      shouldRecognizeRef.current = false;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
      if (isRecording) {
        stopRecording();
      }
      cleanupRecorder();
      setIsSTTListening(false);
      currentSessionTextRef.current = '';
      persistedTranscriptRef.current = '';
      setLiveTranscript('');
      setSelectedFile(null);
      setCurrentAudioUrl('');
      setIsUnwrapping(false);
      setUploading(false);
      setRecordingSeconds(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    window.addEventListener('app:reset', handleAppReset);
    return () => window.removeEventListener('app:reset', handleAppReset);
  }, [isRecording, stopRecording, cleanupRecorder]);

  // Handle recorder error
  useEffect(() => {
    if (recordingError) {
      shouldRecognizeRef.current = false;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {}
        recognitionRef.current = null;
      }
      setIsUnwrapping(false);
      onUploadError?.(recordingError);
    }
  }, [recordingError, onUploadError]);

  const hasReadyData = Boolean(selectedFile || currentAudioUrl || (liveTranscript && !isActivelyRecording));

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
      {isDragging && !isActivelyRecording && !uploading && (
        <div className="absolute inset-0 z-30 bg-teal-600/90 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in pointer-events-none">
          <FiUploadCloud className="w-14 h-14 mb-2 animate-bounce" />
          <h3 className="text-lg font-bold">Drop Audio File Here</h3>
        </div>
      )}

      {/* ============================================================ */}
      {/* STATE 1: RECORDING OR UNWRAPPING IN PROGRESS                 */}
      {/* ============================================================ */}
      {isActivelyRecording || isUnwrapping ? (
        <div className="w-full max-w-md mx-auto flex flex-col items-center text-center py-2 transition-all duration-300 ease-in-out animate-phase-in">
          {/* Slot 1: Status & Timer + Equalizer/Waveform (min-h-[120px]) */}
          <div className="w-full min-h-[120px] flex flex-col items-center justify-center space-y-2 transition-all duration-300 ease-in-out">
            <div className="flex items-center justify-center space-x-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
              </span>
              <span className="text-xs sm:text-sm font-semibold text-red-600 tracking-wide uppercase">
                {isUnwrapping ? 'Starting...' : reciteMode === 'stt' ? 'Listening (Live STT)' : 'Recording Audio'}
              </span>
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                {formatTime(recordingSeconds)}
              </span>
            </div>

            {/* Waveform or Equalizer bars */}
            <div className="w-full flex flex-col items-center justify-center">
              {isUnwrapping ? (
                <div className="h-11 flex items-center justify-center">
                  <div className="hollow-record-btn animate-morph-line" />
                </div>
              ) : reciteMode === 'stt' ? (
                <div className="flex flex-col items-center justify-center space-y-1 w-full">
                  <div className="flex items-center justify-center space-x-1 sm:space-x-1.5 h-10 w-full max-w-xs px-2">
                    {[14, 22, 34, 44, 52, 60, 50, 38, 42, 52, 58, 48, 38, 28, 20, 14].map((maxH, idx) => (
                      <span
                        key={idx}
                        className="w-1 sm:w-1.5 rounded-full bg-teal-500 shadow-2xs animate-sound-wave"
                        style={{
                          height: `${maxH * 0.75}px`,
                          animationDelay: `${(idx * 0.07).toFixed(2)}s`,
                          opacity: liveTranscript ? 0.95 : 0.65,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">
                    {liveTranscript ? 'Recitation detected — keep reciting...' : 'Listening... Recite Arabic verses clearly'}
                  </span>
                </div>
              ) : (
                <Visualizer
                  analyser={analyserRef.current}
                  isRecording={isRecording}
                  height={48}
                />
              )}
            </div>
          </div>

          {/* Fixed Gap */}
          <div className="my-1.5" />

          {/* Slot 2: Real-Time Arabic Text (Smooth expandable height, zero diacritic clipping) */}
          <div className="w-full min-h-[76px] flex flex-col items-center justify-center px-4 py-2 transition-all duration-300 ease-in-out overflow-visible">
            {liveTranscript ? (
              <p
                dir="rtl"
                style={{ textAlign: 'center', lineHeight: '2.2' }}
                className="font-quran text-2xl sm:text-3xl text-slate-900 text-center max-w-lg overflow-visible px-2 transition-all duration-300 ease-in-out"
              >
                {liveTranscript}
              </p>
            ) : (
              <div className="flex items-center justify-center space-x-1.5 py-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600" />
                </span>
                <span className="text-xs text-slate-400 italic">
                  Words appear here in real-time as you recite...
                </span>
              </div>
            )}
          </div>

          {/* Fixed Gap */}
          <div className="my-1.5" />

          {/* Slot 3: Stop Button (LOCKED VERTICAL POSITION) */}
          <div className="w-full h-[52px] flex items-center justify-center transition-all duration-300 ease-in-out">
            <button
              type="button"
              onClick={handleStopRecording}
              className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-8 rounded-full shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer text-sm"
            >
              <FiSquare className="w-4 h-4 fill-current" />
              <span>Stop & Check</span>
            </button>
          </div>
        </div>
      ) : hasReadyData ? (
        /* ============================================================ */
        /* STATE 2: AUDIO / RECITATION READY                           */
        /* ============================================================ */
        <div className="w-full max-w-md mx-auto flex flex-col items-center text-center py-2 transition-all duration-300 ease-in-out animate-phase-in">
          {/* Slot 1: Audio Player (WaveSurfer Waveform) or Settled Waveform */}
          <div className="w-full min-h-[120px] flex flex-col items-center justify-center transition-all duration-300 ease-in-out">
            {currentAudioUrl ? (
              <div className="w-full max-w-sm px-2 animate-fade-in">
                <AudioPlayer audioUrl={currentAudioUrl} height={60} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-1 w-full py-2">
                <div className="flex items-center justify-center space-x-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-teal-600" />
                  <span className="text-xs font-semibold text-teal-800 uppercase tracking-wider">
                    Recitation Captured
                  </span>
                </div>
                <div className="flex items-center justify-center space-x-1 sm:space-x-1.5 h-10 w-full max-w-xs px-2 opacity-65">
                  {[14, 22, 34, 44, 52, 60, 50, 38, 42, 52, 58, 48, 38, 28, 20, 14].map((maxH, idx) => (
                    <span
                      key={idx}
                      className="w-1 sm:w-1.5 rounded-full bg-teal-600 shadow-2xs"
                      style={{ height: `${Math.round(maxH * 0.45)}px` }}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  Ready to identify verse
                </span>
              </div>
            )}
          </div>

          {/* Fixed Gap */}
          <div className="my-1.5" />

          {/* Slot 2: Transcribed Arabic Text (Smooth expandable height, zero diacritic clipping) */}
          <div className="w-full min-h-[76px] flex flex-col items-center justify-center px-4 py-2 transition-all duration-300 ease-in-out overflow-visible">
            {liveTranscript ? (
              <p
                dir="rtl"
                style={{ textAlign: 'center', lineHeight: '2.2' }}
                className="font-quran text-2xl sm:text-3xl text-slate-900 text-center max-w-lg overflow-visible px-2 transition-all duration-300 ease-in-out"
              >
                {liveTranscript}
              </p>
            ) : (
              <p className="text-xs sm:text-sm font-medium text-slate-500 italic py-2">
                Audio recitation captured and ready
              </p>
            )}
          </div>

          {/* Fixed Gap */}
          <div className="my-1.5" />

          {/* Slot 3: Action Buttons (IDENTICAL POSITION AS STOP BUTTON) */}
          <div className="w-full h-[52px] flex items-center justify-center space-x-3 transition-all duration-300 ease-in-out">
            <button
              type="button"
              onClick={handleAudioUpload}
              disabled={uploading}
              className="inline-flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-semibold py-2.5 px-7 rounded-full transition-all shadow-sm text-sm cursor-pointer"
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
        /* STATE 3: IDLE STATE (HERO WITH OPTION 1 & 2 TABS)           */
        /* ============================================================ */
        <div className="w-full max-w-md mx-auto flex flex-col items-center text-center py-2 transition-all duration-300 ease-in-out animate-phase-in">
          {/* Slot 1: Main Record Button (min-h-[120px]) */}
          <div className="w-full min-h-[120px] flex items-center justify-center transition-all duration-300 ease-in-out">
            <button
              type="button"
              onClick={handleStartRecording}
              aria-label={reciteMode === 'stt' ? 'Start live speech recognition recitation' : 'Record Quran recitation audio'}
              className="hollow-record-btn cursor-pointer"
            >
              <FiMic className="w-10 h-10 sm:w-11 sm:h-11 text-teal-600" />
            </button>
          </div>

          {/* Fixed Gap */}
          <div className="my-1.5" />

          {/* Slot 2: Mode Selector Tabs (min-h-[76px]) */}
          <div className="w-full min-h-[76px] flex flex-col items-center justify-center space-y-1.5 py-1 transition-all duration-300 ease-in-out">
            <div className="inline-flex p-1 bg-slate-100 rounded-full border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setReciteMode('stt')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  reciteMode === 'stt'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🎙️ Option 1: Live STT
              </button>
              <button
                type="button"
                onClick={() => setReciteMode('recorder')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  reciteMode === 'recorder'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⏺️ Option 2: Record Audio
              </button>
            </div>

            <p className="text-[11px] text-slate-500 max-w-xs leading-tight">
              {reciteMode === 'stt'
                ? 'Transcribes your Arabic recitation live on mobile without audio conflict.'
                : 'Records audio file with relaxed mobile mic constraints and sends to server.'}
            </p>
          </div>

          {/* Fixed Gap */}
          <div className="my-1.5" />

          {/* Slot 3: Device selector & file upload (h-[52px]) */}
          <div className="w-full h-[52px] flex flex-col items-center justify-center space-y-1 transition-all duration-300 ease-in-out">
            {reciteMode === 'recorder' && audioDevices.length > 1 && (
              <div className="inline-flex items-center space-x-1.5 bg-white border border-slate-200/80 rounded-full px-3 py-0.5 shadow-2xs">
                <FiMic className="w-3 h-3 text-teal-600 shrink-0" />
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="text-[11px] font-medium text-slate-700 bg-transparent focus:outline-none cursor-pointer border-none p-0 pr-1 max-w-[180px] truncate"
                >
                  {audioDevices.map((device, idx) => (
                    <option key={device.deviceId || idx} value={device.deviceId}>
                      {device.label || `Microphone ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
