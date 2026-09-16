import { useState, useRef, useCallback, useEffect } from 'react';
import logger, { LOG_CATEGORIES } from '../utils/logger';

export const useAudioRecorder = (options = {}) => {
  const { onRecordingComplete } = options;
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  
  // Microphone device enumeration
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Enumerate available audio input devices (filtering virtual duplicates and detecting distinct physical mics)
  const refreshAudioDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      logger.warn(LOG_CATEGORIES.RECORDER, 'navigator.mediaDevices.enumerateDevices is not available');
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const rawMics = devices.filter(d => d.kind === 'audioinput');

      // 1. Separate real physical hardware devices from virtual aliases ('default', 'communications')
      let physicalMics = rawMics.filter(
        d => d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications'
      );

      // If no explicit hardware device IDs are exposed yet (e.g. mobile or pre-permission)
      if (physicalMics.length === 0 && rawMics.length > 0) {
        physicalMics = rawMics;
      }

      // 2. Deduplicate devices sharing the same groupId or same cleaned label
      const seenGroups = new Set();
      const seenLabels = new Set();
      const distinctMics = [];

      for (const mic of physicalMics) {
        const cleanLabel = (mic.label || '')
          .replace(/^(Default|Communications)\s*-\s*/i, '')
          .trim();

        const groupKey = mic.groupId || null;
        const labelKey = cleanLabel ? cleanLabel.toLowerCase() : null;

        if (groupKey && seenGroups.has(groupKey)) {
          continue;
        }
        if (labelKey && seenLabels.has(labelKey)) {
          continue;
        }

        if (groupKey) seenGroups.add(groupKey);
        if (labelKey) seenLabels.add(labelKey);

        distinctMics.push({
          deviceId: mic.deviceId,
          groupId: mic.groupId,
          label: cleanLabel || mic.label || `Microphone ${distinctMics.length + 1}`
        });
      }

      logger.info(LOG_CATEGORIES.RECORDER, `Found ${distinctMics.length} distinct audio input device(s) (from ${rawMics.length} raw entries)`, distinctMics);
      setAudioDevices(distinctMics);

      // Maintain valid selected device ID
      setSelectedDeviceId(prev => {
        if (prev && distinctMics.some(d => d.deviceId === prev)) {
          return prev;
        }
        return distinctMics[0]?.deviceId || '';
      });
    } catch (err) {
      logger.warn(LOG_CATEGORIES.RECORDER, 'Error enumerating audio devices', err);
    }
  }, []);

  // Listen for device change events (e.g. mic plugged/unplugged)
  useEffect(() => {
    refreshAudioDevices();

    const mediaDev = navigator.mediaDevices;
    if (mediaDev) {
      if (mediaDev.addEventListener) {
        mediaDev.addEventListener('devicechange', refreshAudioDevices);
      } else {
        mediaDev.ondevicechange = refreshAudioDevices;
      }
      return () => {
        if (mediaDev.removeEventListener) {
          mediaDev.removeEventListener('devicechange', refreshAudioDevices);
        } else {
          mediaDev.ondevicechange = null;
        }
      };
    }
  }, [refreshAudioDevices]);

  // Ensure labels are unlocked if user focuses or opens the mic selector
  const ensureMicrophonePermissions = useCallback(async () => {
    if (audioDevices.length > 0 && audioDevices.some(d => d.label && !d.label.startsWith('Microphone '))) {
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tempStream.getTracks().forEach(t => t.stop());
      await refreshAudioDevices();
    } catch (e) {
      // Permission not yet granted; will prompt when recording starts
    }
  }, [audioDevices, refreshAudioDevices]);

  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close().catch(console.error);
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    audioContextRef.current = null;
    analyserRef.current = null;
    audioChunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    try {
      await cleanup();
      setError(null);
      audioChunksRef.current = [];
      
      const audioConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true,
      };

      if (selectedDeviceId) {
        audioConstraints.deviceId = { exact: selectedDeviceId };
      }

      logger.info(LOG_CATEGORIES.RECORDER, 'Requesting microphone audio stream', {
        audioConstraints,
        selectedDeviceId: selectedDeviceId || 'default',
      });

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
        });
      } catch (devErr) {
        // Fallback to default audio input if exact device or constraints are not accessible
        logger.warn(LOG_CATEGORIES.RECORDER, 'Relaxed mic acquisition fallback', {
          failedDeviceId: selectedDeviceId,
          error: devErr.message,
        });
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }
      
      streamRef.current = stream;
      const audioTracks = stream.getAudioTracks().map((track) => ({
        id: track.id,
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        settings: track.getSettings ? track.getSettings() : {},
      }));

      logger.info(LOG_CATEGORIES.RECORDER, 'Microphone stream successfully acquired', {
        audioTracks,
      });
      
      // Refresh audio devices now that permissions have been granted
      refreshAudioDevices();
      
      // Set up audio context and analyser (let hardware use native sample rate on mobile)
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
        } catch (e) {}
      }
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Determine best supported MIME type
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      // Set up media recorder
      const mediaRecorderOptions = { audioBitsPerSecond: 128000 };
      if (mimeType) {
        mediaRecorderOptions.mimeType = mimeType;
      }

      logger.info(LOG_CATEGORIES.RECORDER, 'Initializing MediaRecorder', {
        selectedMimeType: mimeType || 'browser-default',
        audioBitsPerSecond: mediaRecorderOptions.audioBitsPerSecond,
        audioContextState: audioContext.state,
        sampleRate: audioContext.sampleRate,
      });

      const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          logger.debug(LOG_CATEGORIES.RECORDER, `Audio chunk received: ${event.data.size} bytes (total chunks: ${audioChunksRef.current.length})`);
        }
      };

      mediaRecorder.onerror = (mrErr) => {
        logger.error(LOG_CATEGORIES.RECORDER, 'MediaRecorder encountered an error', mrErr);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(50);
      setIsRecording(true);
      logger.info(LOG_CATEGORIES.RECORDER, 'MediaRecorder recording started successfully');
      
      return { audioContext, analyser };
      
    } catch (err) {
      let errorMessage = 'Failed to start recording';
      let errorType = err.name || 'UnknownError';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone access was denied by the browser or operating system';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No microphone device was found on this system';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Microphone is already in use by another application or blocked by the system';
      }

      logger.error(LOG_CATEGORIES.RECORDER, `Recording start failed [${errorType}]: ${errorMessage}`, {
        errorName: err.name,
        errorMessage: err.message,
        stack: err.stack,
      });
      
      setError(errorMessage);
      await cleanup();
      throw new Error(errorMessage);
    }
  }, [cleanup, selectedDeviceId, refreshAudioDevices]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      logger.warn(LOG_CATEGORIES.RECORDER, 'stopRecording called but MediaRecorder is not active');
      return null;
    }
    
    try {
      setIsRecording(false);
      logger.info(LOG_CATEGORIES.RECORDER, 'Stopping MediaRecorder', {
        chunksRecorded: audioChunksRef.current.length,
      });
      
      // Stop the media recorder
      mediaRecorderRef.current.stop();
      
      // Wait for the final data
      const blob = await new Promise((resolve) => {
        const onStop = () => {
          const type = mediaRecorderRef.current?.mimeType || 'audio/webm';
          const finalBlob = new Blob(audioChunksRef.current, { type });
          mediaRecorderRef.current?.removeEventListener('stop', onStop);
          resolve(finalBlob);
        };
        
        mediaRecorderRef.current?.addEventListener('stop', onStop, { once: true });
      });
      
      const url = URL.createObjectURL(blob);
      const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
      const file = new File([blob], `recording_${Date.now()}.${ext}`, {
        type: blob.type || 'audio/webm',
        lastModified: Date.now(),
      });
      
      logger.info(LOG_CATEGORIES.RECORDER, 'Audio recording blob finalized', {
        sizeBytes: blob.size,
        sizeFormatted: `${(blob.size / 1024).toFixed(1)} KB`,
        mimeType: blob.type,
        fileName: file.name,
      });

      setAudioBlob(file);
      setAudioUrl(url);
      
      // Call the onRecordingComplete callback if provided
      if (typeof onRecordingComplete === 'function') {
        onRecordingComplete({ file, url });
      }
      
      return { file, url };
      
    } catch (error) {
      logger.error(LOG_CATEGORIES.RECORDER, 'Error processing audio chunks into Blob', error);
      setError('Failed to process recording');
      throw error;
    } finally {
      await cleanup();
    }
  }, [cleanup, onRecordingComplete]);

  return {
    isRecording,
    error,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    cleanup,
    streamRef,
    audioContextRef,
    analyserRef,
    animationFrameRef,
    audioDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    refreshAudioDevices,
    ensureMicrophonePermissions,
  };
};
