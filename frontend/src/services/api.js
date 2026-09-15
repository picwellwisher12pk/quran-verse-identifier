import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

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
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);

    // Handle common errors
    if (error.response?.status === 404) {
      console.error('Resource not found');
    } else if (error.response?.status === 500) {
      console.error('Server error');
    } else if (!error.response) {
      console.error('Network error - API server may be offline');
    }

    return Promise.reject(error);
  }
);

export const apiService = {
  async identifyVerse(audioFile, onUploadProgress, transcript = null) {
    // Cancel any existing identify requests
    if (cancelTokenSources.has('identify')) {
      cancelTokenSources.get('identify').cancel('New request initiated');
      cancelTokenSources.delete('identify');
    }

    // Create a new cancel token for this request
    const source = axios.CancelToken.source();
    cancelTokenSources.set('identify', source);

    try {
      const formData = new FormData();
      if (audioFile) {
        formData.append('file', audioFile);
      }
      if (transcript && transcript.trim()) {
        formData.append('transcript', transcript.trim());
      }

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
        console.log('Request canceled:', error.message);
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