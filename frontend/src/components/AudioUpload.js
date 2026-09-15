import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import AudioPlayer from './audio/AudioPlayer';
import FileUpload from './audio/FileUpload';
import { apiService } from '../services/api';
import { FiMic, FiSearch } from 'react-icons/fi';

const AudioUpload = ({ onUploadStart, onUploadSuccess, onUploadError }) => {
  // Mode selection: 'audio' | 'text'
  const [activeTab, setActiveTab] = useState('audio');

  // State management
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState('');

  // Live Speech Recognition state
  const [liveTranscript, setLiveTranscript] = useState('');
  const recognitionRef = useRef(null);

  // Instant text search state
  const [textQuery, setTextQuery] = useState('');

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
    }
  });

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

  // Start recording with mic + speech recognition
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

  // Handle file selection
  const handleFileSelect = useCallback((file, error) => {
    if (error) {
      console.error('Error selecting file:', error);
      onUploadError?.(error);
      return;
    }

    if (file) {
      setSelectedFile(file);
      setCurrentAudioUrl(URL.createObjectURL(file));
      setLiveTranscript('');
    }
  }, [onUploadError]);

  // Handle audio identification upload
  const handleAudioUpload = useCallback(async () => {
    if (!selectedFile && !liveTranscript.trim()) return;

    try {
      setUploading(true);
      setProgress(0);
      onUploadStart?.();

      const response = await apiService.identifyVerse(
        selectedFile,
        (percentCompleted) => {
          setProgress(percentCompleted);
        },
        liveTranscript
      );

      setUploading(false);
      onUploadSuccess?.(response, selectedFile);
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
      onUploadError?.(error);
    }
  }, [selectedFile, liveTranscript, onUploadStart, onUploadSuccess, onUploadError]);

  // Handle instant text identification
  const handleTextIdentify = useCallback(async (e) => {
    e?.preventDefault();
    if (!textQuery.trim() || textQuery.trim().length < 2) return;

    try {
      setUploading(true);
      setProgress(50);
      onUploadStart?.();

      const response = await apiService.identifyVerseByText(textQuery.trim(), 5);

      setUploading(false);
      setProgress(100);
      onUploadSuccess?.(response, null);
    } catch (error) {
      console.error('Text search error:', error);
      setUploading(false);
      onUploadError?.(error);
    }
  }, [textQuery, onUploadStart, onUploadSuccess, onUploadError]);

  // Clean up
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

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Mode Switcher Tabs */}
      <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('audio')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'audio'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FiMic className="w-4 h-4" />
          <span>Voice & Audio Recitation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('text')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'text'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FiSearch className="w-4 h-4" />
          <span>Instant Arabic Text Search</span>
        </button>
      </div>

      {activeTab === 'audio' ? (
        <>
          {/* Upload or Record Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Upload */}
            <FileUpload
              onFileSelect={handleFileSelect}
              disabled={isRecording || uploading}
              accept="audio/*"
              maxSize={50 * 1024 * 1024}
            />

            {/* Record Button with Speech Recognition */}
            <div className="flex flex-col justify-between space-y-3">
              <button
                type="button"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={uploading}
                className={`flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all ${
                  isRecording
                    ? 'bg-red-50 border-red-400 text-red-700 shadow-sm animate-pulse'
                    : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50 text-slate-700'
                } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div
                  className={`flex items-center justify-center h-12 w-12 rounded-full border-2 mb-3 ${
                    isRecording ? 'bg-red-100 border-red-500' : 'bg-white border-slate-300'
                  }`}
                >
                  {isRecording ? (
                    <div className="h-5 w-5 bg-red-600 rounded-xs" />
                  ) : (
                    <FiMic className="h-6 w-6 text-blue-600" />
                  )}
                </div>
                <span className="text-sm font-semibold">
                  {isRecording ? 'Stop Recording' : 'Recite via Microphone'}
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  {isRecording ? 'Click when recitation ends' : 'Click to start reciting'}
                </span>
              </button>

              {/* Microphone Device Selector */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5 px-0.5">
                  <span className="font-medium flex items-center space-x-1.5">
                    <FiMic className="w-3.5 h-3.5 text-blue-600" />
                    <span>Input Microphone</span>
                  </span>
                  {audioDevices.length > 0 && (
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded-md">
                      {audioDevices.length} available
                    </span>
                  )}
                </div>

                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  onClick={ensureMicrophonePermissions}
                  disabled={isRecording || uploading}
                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg py-2 px-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 truncate shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Default System Microphone</option>
                  {audioDevices.map((mic, idx) => (
                    <option key={mic.deviceId || idx} value={mic.deviceId}>
                      {mic.label || `Microphone ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Live Detected Arabic Speech Display */}
          {(isRecording || liveTranscript) && (
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2 text-xs font-semibold text-blue-800">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  <span>Live Arabic Speech Transcript</span>
                </div>
                <span className="text-xs text-blue-600 font-medium">
                  {isRecording ? 'Listening live...' : 'Captured'}
                </span>
              </div>
              <p
                dir="rtl"
                className="font-quran text-2xl text-slate-900 text-right leading-relaxed bg-white/80 p-3 rounded-lg border border-blue-100"
              >
                {liveTranscript || (
                  <span className="text-slate-400 font-sans text-sm">
                    Recite clearly in Arabic... Words will appear here in real-time.
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Recorded/Uploaded Audio Player Preview */}
          {(currentAudioUrl || isRecording) && (
            <div className="mt-4">
              <AudioPlayer
                audioUrl={currentAudioUrl}
                isRecording={isRecording}
                analyser={analyserRef.current}
              />
            </div>
          )}

          {/* Identify Button */}
          {(selectedFile || liveTranscript) && !uploading && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleAudioUpload}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 active:scale-98"
              >
                <FiSearch className="w-5 h-5" />
                <span>Identify Recited Verse</span>
              </button>
            </div>
          )}
        </>
      ) : (
        /* Instant Arabic Text Search Tab */
        <form onSubmit={handleTextIdentify} className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Type or Paste Quran Recitation (Arabic)
              </label>
              <textarea
                dir="rtl"
                rows={3}
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
                placeholder="مثال: إياك نعبد وإياك نستعين أو قل هو الله أحد"
                className="w-full font-quran text-2xl p-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 shadow-inner"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Our phonetically-normalized fuzzy search identifies matches in less than 5 milliseconds across all 6,236 verses.
              </p>
            </div>

            {/* Quick Suggestions Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-slate-500">Try reciting:</span>
              {[
                'إياك نعبد وإياك نستعين',
                'قل هو الله أحد',
                'الله لا إله إلا هو الحي القيوم',
                'الحمد لله رب العالمين',
              ].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setTextQuery(sample)}
                  className="px-2.5 py-1 text-xs font-arabic bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors"
                >
                  {sample}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={!textQuery.trim() || uploading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2"
            >
              <FiSearch className="w-5 h-5" />
              <span>Search Across 6,236 Verses</span>
            </button>
          </div>
        </form>
      )}

      {/* Upload/Processing Progress */}
      {uploading && (
        <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between text-sm text-slate-600 mb-2 font-medium">
            <span>Analyzing recitation with AI...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
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

export default AudioUpload;