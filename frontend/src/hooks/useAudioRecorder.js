import { useState, useRef, useCallback, useEffect } from 'react';

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

  // Enumerate available audio input devices
  const refreshAudioDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices
        .filter(d => d.kind === 'audioinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${index + 1}`
        }));
      setAudioDevices(mics);
    } catch (err) {
      console.warn('Error enumerating audio devices:', err);
    }
  }, []);

  // Listen for device change events (e.g. mic plugged/unplugged)
  useEffect(() => {
    refreshAudioDevices();

    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshAudioDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', refreshAudioDevices);
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
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000,
      };

      if (selectedDeviceId) {
        audioConstraints.deviceId = { exact: selectedDeviceId };
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
        });
      } catch (devErr) {
        // Fallback to default audio input if exact device is not accessible
        if (selectedDeviceId) {
          console.warn('Selected mic failed, falling back to default:', devErr);
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
              sampleRate: 48000,
            },
          });
        } else {
          throw devErr;
        }
      }
      
      streamRef.current = stream;
      
      // Refresh audio devices now that permissions have been granted
      refreshAudioDevices();
      
      // Set up audio context and analyser
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext({ sampleRate: 48000 });
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
      const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(50);
      setIsRecording(true);
      
      return { audioContext, analyser };
      
    } catch (err) {
      console.error('Error starting recording:', err);
      let errorMessage = 'Failed to start recording';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Microphone access was denied';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No microphone found';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Microphone is already in use';
      }
      
      setError(errorMessage);
      await cleanup();
      throw new Error(errorMessage);
    }
  }, [cleanup, selectedDeviceId, refreshAudioDevices]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return null;
    }
    
    try {
      setIsRecording(false);
      
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
      
      setAudioBlob(file);
      setAudioUrl(url);
      
      // Call the onRecordingComplete callback if provided
      if (typeof onRecordingComplete === 'function') {
        onRecordingComplete({ file, url });
      }
      
      return { file, url };
      
    } catch (error) {
      console.error('Error stopping recording:', error);
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
