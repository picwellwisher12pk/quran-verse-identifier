/**
 * Comprehensive Diagnostic Logger for Quran Verse Identifier (QVI)
 * 
 * Supports structured logging across the entire pipeline:
 * - RECORDER: Microphone permissions, constraints, MediaRecorder chunks, blob conversion
 * - STT: Browser SpeechRecognition start, interim/final results, error codes, restarts
 * - API: Network calls, upload progress, response timing, server errors, status codes
 * - MATCH: Verse candidate scoring, confidence ratings, matching sources (STT, acoustic, hybrid)
 * - UI: State transitions, rendering phases, audio visualizer/player events
 * 
 * Production Toggle:
 * 1. URL parameter: ?debug=true or ?logs=1 or #debug
 * 2. localStorage: localStorage.setItem('qvi_debug', 'true')
 * 3. Global API: window.qviLogger.enable() / disable() / getLogs() / export()
 * 4. In-app Debug Console overlay
 */

const STORAGE_KEY = 'qvi_debug';
const MAX_LOG_HISTORY = 300;

// Log categories
export const LOG_CATEGORIES = {
  ENV: 'ENV',
  RECORDER: 'RECORDER',
  STT: 'STT',
  API: 'API',
  MATCH: 'MATCH',
  UI: 'UI',
  AUDIO: 'AUDIO',
};

// Log levels
export const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

const CATEGORY_COLORS = {
  ENV: { bg: '#3b82f6', text: '#ffffff' },       // blue
  RECORDER: { bg: '#8b5cf6', text: '#ffffff' },  // purple
  STT: { bg: '#ec4899', text: '#ffffff' },       // pink
  API: { bg: '#0d9488', text: '#ffffff' },       // teal
  MATCH: { bg: '#f59e0b', text: '#ffffff' },     // amber
  UI: { bg: '#64748b', text: '#ffffff' },        // slate
  AUDIO: { bg: '#06b6d4', text: '#ffffff' },     // cyan
};

class DiagnosticLogger {
  constructor() {
    this.logs = [];
    this.listeners = new Set();
    this.startTime = Date.now();
    this.enabled = this._checkInitialEnabled();

    // Expose to window for production debugging in DevTools
    if (typeof window !== 'undefined') {
      window.qviLogger = this;
      
      // Auto-detect URL parameter ?debug=true or ?logs=1 or #debug
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (
          urlParams.get('debug') === 'true' ||
          urlParams.get('debug') === '1' ||
          urlParams.get('logs') === '1' ||
          window.location.hash.includes('debug')
        ) {
          this.enable();
        }
      } catch (e) {}

      // Log environment capabilities at startup
      this._logEnvironment();
    }
  }

  _checkInitialEnabled() {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true' || stored === '1') return true;
      const urlParams = new URLSearchParams(window.location.search);
      return (
        urlParams.get('debug') === 'true' ||
        urlParams.get('debug') === '1' ||
        urlParams.get('logs') === '1' ||
        window.location.hash.includes('debug')
      );
    } catch (e) {
      return false;
    }
  }

  enable() {
    this.enabled = true;
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch (e) {}
    this._notifyListeners();
    console.log(
      '%c[QVI:LOGGER]%c Diagnostic logging ENABLED. Run window.qviLogger.getLogs() to inspect.',
      'background: #0d9488; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
      'color: #0d9488; font-weight: bold;'
    );
  }

  disable() {
    this.enabled = false;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    this._notifyListeners();
    console.log('[QVI:LOGGER] Diagnostic logging DISABLED.');
  }

  toggle() {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  clear() {
    this.logs = [];
    this._notifyListeners();
  }

  getLogs(filterCategory = null) {
    if (filterCategory) {
      return this.logs.filter((l) => l.category === filterCategory);
    }
    return [...this.logs];
  }

  export() {
    return JSON.stringify(this.logs, null, 2);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notifyListeners() {
    const logsCopy = [...this.logs];
    this.listeners.forEach((fn) => {
      try {
        fn(logsCopy, this.enabled);
      } catch (e) {}
    });
  }

  _formatTime(now = new Date()) {
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  }

  _record(category, level, message, data = null) {
    const now = new Date();
    const elapsedMs = now.getTime() - this.startTime;
    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now.toISOString(),
      timeStr: this._formatTime(now),
      elapsed: `+${elapsedMs}ms`,
      category,
      level,
      message,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > MAX_LOG_HISTORY) {
      this.logs.shift();
    }

    this._notifyListeners();

    // Always output to console if enabled OR if it's an ERROR
    if (this.enabled || level === LOG_LEVELS.ERROR) {
      const color = CATEGORY_COLORS[category] || { bg: '#475569', text: '#ffffff' };
      const categoryStyle = `background: ${color.bg}; color: ${color.text}; padding: 1px 5px; border-radius: 3px; font-weight: bold; font-size: 11px;`;
      const timeStyle = 'color: #94a3b8; font-size: 10px; margin-right: 4px;';
      const msgStyle = level === LOG_LEVELS.ERROR ? 'color: #ef4444; font-weight: bold;' : level === LOG_LEVELS.WARN ? 'color: #f59e0b; font-weight: bold;' : 'color: #1e293b;';

      const consoleArgs = [
        `%c${category}%c ${entry.timeStr} (${entry.elapsed}) %c${message}`,
        categoryStyle,
        timeStyle,
        msgStyle,
      ];

      if (data !== null && data !== undefined) {
        consoleArgs.push(data);
      }

      switch (level) {
        case LOG_LEVELS.ERROR:
          console.error(...consoleArgs);
          break;
        case LOG_LEVELS.WARN:
          console.warn(...consoleArgs);
          break;
        case LOG_LEVELS.DEBUG:
          console.debug(...consoleArgs);
          break;
        default:
          console.log(...consoleArgs);
      }
    }
  }

  // Convenience methods
  debug(category, message, data) {
    this._record(category, LOG_LEVELS.DEBUG, message, data);
  }

  info(category, message, data) {
    this._record(category, LOG_LEVELS.INFO, message, data);
  }

  warn(category, message, data) {
    this._record(category, LOG_LEVELS.WARN, message, data);
  }

  error(category, message, errorOrData) {
    let formattedData = errorOrData;
    if (errorOrData instanceof Error) {
      formattedData = {
        name: errorOrData.name,
        message: errorOrData.message,
        stack: errorOrData.stack,
        code: errorOrData.code,
      };
    }
    this._record(category, LOG_LEVELS.ERROR, message, formattedData);
  }

  _logEnvironment() {
    const hasMediaDevices = Boolean(navigator.mediaDevices?.getUserMedia);
    const hasAudioContext = Boolean(window.AudioContext || window.webkitAudioContext);
    const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
    const hasSpeechRecognition = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    const isSecure = window.isSecureContext;

    // Supported audio mime types
    const supportedMimes = [];
    if (hasMediaRecorder && MediaRecorder.isTypeSupported) {
      [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
        'audio/wav',
      ].forEach((mime) => {
        if (MediaRecorder.isTypeSupported(mime)) {
          supportedMimes.push(mime);
        }
      });
    }

    this.info(LOG_CATEGORIES.ENV, 'Browser Environment Diagnostic', {
      isSecureContext: isSecure,
      userAgent: navigator.userAgent,
      hasMediaDevices,
      hasAudioContext,
      hasMediaRecorder,
      hasSpeechRecognition,
      sttProvider: window.SpeechRecognition ? 'Standard SpeechRecognition' : window.webkitSpeechRecognition ? 'webkitSpeechRecognition' : 'NONE',
      supportedMimeTypes: supportedMimes,
      protocol: window.location.protocol,
      origin: window.location.origin,
    });

    if (!isSecure && window.location.hostname !== 'localhost') {
      this.error(LOG_CATEGORIES.ENV, 'CRITICAL: Insecure Context detected! Microphone access will be blocked by modern browsers (requires HTTPS).', {
        protocol: window.location.protocol,
        hostname: window.location.hostname,
      });
    }

    if (!hasSpeechRecognition) {
      this.warn(LOG_CATEGORIES.STT, 'SpeechRecognition API is not supported in this browser. Recitation identification will fall back solely to audio matching.');
    }
  }
}

export const logger = new DiagnosticLogger();
export default logger;
