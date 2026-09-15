import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = (options = {}) => {
  const { onRecordingComplete } = options;
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

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
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
      });
      
      streamRef.current = stream;
      
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
  }, [cleanup]);

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
  };
};
