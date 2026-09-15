import axios from 'axios';
import logger, { LOG_CATEGORIES } from '../utils/logger';

const API_BASE_URL = (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) || import.meta.env?.VITE_API_URL || '/api';

// Create a base axios instance without timeout for requests that need custom timeouts
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create a map to store cancel tokens
const cancelTokenSources = new Map();

api.interceptors.request.use(
  (config) => {
    config._startTime = Date.now();
    logger.info(LOG_CATEGORIES.API, `[HTTP OUT] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      hasHeaders: Boolean(config.headers),
    });
    return config;
  },
  (error) => {
    logger.error(LOG_CATEGORIES.API, `[HTTP REQ ERROR] Request build failed`, error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    const elapsed = response.config?._startTime ? `${Date.now() - response.config._startTime}ms` : 'unknown';
    logger.info(LOG_CATEGORIES.API, `[HTTP IN ${response.status}] ${response.config?.method?.toUpperCase()} ${response.config?.url} (${elapsed})`, {
      status: response.status,
      statusText: response.statusText,
      elapsed,
      dataSummary: typeof response.data === 'object' ? {
        keys: Object.keys(response.data || {}),
        success: response.data?.success,
        matchesCount: response.data?.matches?.length,
      } : null,
    });
    return response;
  },
  (error) => {
    const elapsed = error.config?._startTime ? `${Date.now() - error.config._startTime}ms` : 'unknown';
    const status = error.response?.status;
    const url = error.config?.url || 'unknown-url';
    const serverDetail = error.response?.data?.detail || error.response?.data?.message || error.response?.data;

    logger.error(LOG_CATEGORIES.API, `[HTTP ERR ${status || 'NETWORK'}] ${url} (${elapsed}): ${error.message}`, {
      status,
      serverDetail,
      code: error.code,
      elapsed,
      isNetworkError: !error.response && Boolean(error.request),
      isTimeout: error.code === 'ECONNABORTED',
    });

    return Promise.reject(error);
  }
);

export const apiService = {
  async identifyVerse(audioFile, onUploadProgress, transcript = null) {
    // Cancel any existing identify requests
    if (cancelTokenSources.has('identify')) {
      logger.info(LOG_CATEGORIES.API, 'Cancelling previous in-flight /identify request');
      cancelTokenSources.get('identify').cancel('New request initiated');
      cancelTokenSources.delete('identify');
    }

    // Create a new cancel token for this request
    const source = axios.CancelToken.source();
    cancelTokenSources.set('identify', source);

    try {
      const formData = new FormData();
      let fileSummary = null;
      if (audioFile) {
        formData.append('file', audioFile);
        fileSummary = {
          name: audioFile.name,
          sizeBytes: audioFile.size,
          sizeKB: `${(audioFile.size / 1024).toFixed(1)} KB`,
          type: audioFile.type,
        };
      }
      if (transcript && transcript.trim()) {
        formData.append('transcript', transcript.trim());
      }

      logger.info(LOG_CATEGORIES.API, 'Dispatching POST /api/identify', {
        hasAudioFile: Boolean(audioFile),
        file: fileSummary,
        hasTranscript: Boolean(transcript && transcript.trim()),
        transcriptText: transcript ? `"${transcript.trim()}"` : null,
      });

      const response = await api.post('/identify', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        cancelToken: source.token,
        timeout: 300000, // 5 minutes timeout for the identify endpoint
        onUploadProgress: (progressEvent) => {
          if (onUploadProgress && audioFile) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            onUploadProgress(percentCompleted);
          }
        },
      });

      // Clean up the cancel token
      cancelTokenSources.delete('identify');
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) {
        logger.info(LOG_CATEGORIES.API, 'Request canceled: ' + error.message);
        throw new Error('Request was canceled');
      }
      throw this.handleError(error);
    }
  },

  async identifyVerseByText(text, limit = 5) {
    try {
      const response = await api.post('/identify/text', {
        text,
        limit,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  cancelRequest(requestId) {
    if (cancelTokenSources.has(requestId)) {
      cancelTokenSources.get(requestId).cancel('Request canceled by user');
      cancelTokenSources.delete(requestId);
      return true;
    }
    return false;
  },

  cancelAllRequests() {
    let hasCanceled = false;
    cancelTokenSources.forEach((source, requestId) => {
      source.cancel(`Request ${requestId} was canceled`);
      cancelTokenSources.delete(requestId);
      hasCanceled = true;
    });
    return hasCanceled;
  },

  async getStatistics() {
    try {
      const response = await api.get('/stats');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async getVerse(surahNumber, ayahNumber) {
    try {
      const response = await api.get(`/verses/${surahNumber}/${ayahNumber}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async getSurahs() {
    try {
      const response = await api.get('/surahs');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async searchVerses(query, limit = 10) {
    try {
      const response = await api.get('/search', {
        params: { q: query, limit }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async submitFeedback(verseId, wasCorrect, confidence, userComment = null) {
    try {
      const response = await api.post('/feedback', {
        verse_id: verseId,
        was_correct: wasCorrect,
        confidence: confidence,
        user_comment: userComment
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async getHealth() {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  async healthCheck() {
    return this.getHealth();
  },

  async getVersion() {
    try {
      const response = await api.get('/version');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      const serverMessage = data?.detail || data?.message || data?.error;

      switch (status) {
        case 400:
          return new Error(serverMessage || 'Bad request - please check your input');
        case 404:
          return new Error(serverMessage || 'Resource not found');
        case 413:
          return new Error('File too large - please try a smaller audio recording (max 25MB)');
        case 422:
          return new Error(serverMessage || 'Invalid input format - please provide an audio file or recitation transcript');
        case 500:
          return new Error(serverMessage || 'Server encountered an issue identifying this verse. Please try reciting again.');
        case 503:
          return new Error(serverMessage || 'Service is temporarily busy. Please retry in a moment.');
        default:
          return new Error(serverMessage || `Server error (${status})`);
      }
    } else if (error.request) {
      // Network error
      return new Error('Unable to connect to server - please check your internet connection');
    } else {
      // Other error
      return new Error(error.message || 'An unexpected error occurred');
    }
  },

  validateAudioFile(file) {
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/flac',
      'audio/x-flac',
      'audio/mp4',
      'audio/x-m4a',
      'audio/aac'
    ];

    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Please upload a valid audio file (MP3, WAV, FLAC, M4A, or AAC)');
    }

    if (file.size > maxSize) {
      throw new Error('File size must be less than 50MB');
    }

    return true;
  },

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
};

export default apiService;