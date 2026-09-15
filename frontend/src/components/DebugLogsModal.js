import React, { useState, useEffect, useRef } from 'react';
import { logger, LOG_CATEGORIES, LOG_LEVELS } from '../utils/logger';
import { FiTerminal, FiX, FiTrash2, FiCopy, FiCheck, FiFilter } from 'react-icons/fi';

const CATEGORY_COLORS = {
  ENV: 'bg-blue-100 text-blue-800 border-blue-200',
  RECORDER: 'bg-purple-100 text-purple-800 border-purple-200',
  STT: 'bg-pink-100 text-pink-800 border-pink-200',
  API: 'bg-teal-100 text-teal-800 border-teal-200',
  MATCH: 'bg-amber-100 text-amber-800 border-amber-200',
  UI: 'bg-slate-100 text-slate-800 border-slate-200',
  AUDIO: 'bg-cyan-100 text-cyan-800 border-cyan-200',
};

const DebugLogsModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [enabled, setEnabled] = useState(logger.isEnabled());
  const [logs, setLogs] = useState(logger.getLogs());
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef(null);

  // Subscribe to live log updates
  useEffect(() => {
    const unsubscribe = logger.subscribe((updatedLogs, isEnabled) => {
      setLogs(updatedLogs);
      setEnabled(isEnabled);
    });
    return unsubscribe;
  }, []);

  // Keyboard shortcut: Ctrl + Shift + D to toggle logs panel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (isOpen && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const handleToggleLogging = () => {
    const newState = logger.toggle();
    setEnabled(newState);
  };

  const handleClear = () => {
    logger.clear();
  };

  const handleCopyLogs = async () => {
    try {
      const text = logs
        .map(
          (l) =>
            `[${l.timeStr}] [${l.category}] [${l.level}] ${l.message}${
              l.data ? ' ' + JSON.stringify(l.data) : ''
            }`
        )
        .join('\n');
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy logs', err);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (onlyErrors && log.level !== LOG_LEVELS.ERROR && log.level !== LOG_LEVELS.WARN) {
      return false;
    }
    if (selectedCategory !== 'ALL' && log.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  const errorCount = logs.filter((l) => l.level === LOG_LEVELS.ERROR).length;
  const warnCount = logs.filter((l) => l.level === LOG_LEVELS.WARN).length;

  return (
    <>
      {/* Floating Indicator Button (visible in bottom-right corner) */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center space-x-2">
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md transition-all border ${
            errorCount > 0
              ? 'bg-red-600 text-white border-red-700 animate-pulse'
              : enabled
              ? 'bg-slate-900 text-teal-400 border-slate-700'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
          title="Diagnostic Logs (Ctrl+Shift+D)"
        >
          <FiTerminal className="text-sm" />
          <span>Logs</span>
          {errorCount > 0 ? (
            <span className="bg-red-900 text-white px-1.5 py-0.2 rounded-full text-[10px]">
              {errorCount} err
            </span>
          ) : (
            <span className="text-[10px] opacity-75">{logs.length}</span>
          )}
        </button>
      </div>

      {/* Logs Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-slate-900 text-slate-100 w-full sm:max-w-4xl h-[85vh] sm:h-[80vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl border border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
            {/* Header */}
            <div className="px-4 py-3 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <FiTerminal className="text-teal-400 text-lg" />
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Diagnostic Logs
                    {enabled ? (
                      <span className="bg-teal-900/80 text-teal-300 text-[10px] px-2 py-0.5 rounded-full font-mono border border-teal-700">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="bg-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
                        ERRORS ONLY
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Shortcut: <kbd className="bg-slate-700 px-1 rounded">Ctrl</kbd> +{' '}
                    <kbd className="bg-slate-700 px-1 rounded">Shift</kbd> +{' '}
                    <kbd className="bg-slate-700 px-1 rounded">D</kbd> | URL: <code className="text-teal-300">?debug=true</code>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleToggleLogging}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors border ${
                    enabled
                      ? 'bg-teal-600 hover:bg-teal-500 text-white border-teal-500'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'
                  }`}
                >
                  {enabled ? 'Logging ON' : 'Turn ON Verbose'}
                </button>

                <button
                  onClick={handleCopyLogs}
                  className="p-1.5 rounded-md hover:bg-slate-700 text-slate-300 transition-colors title='Copy Logs'"
                  title="Copy formatted logs to clipboard"
                >
                  {copied ? <FiCheck className="text-teal-400" /> : <FiCopy />}
                </button>

                <button
                  onClick={handleClear}
                  className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                  title="Clear logs"
                >
                  <FiTrash2 />
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="Close"
                >
                  <FiX className="text-lg" />
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto text-xs">
              <div className="flex items-center space-x-1.5">
                <FiFilter className="text-slate-400 mr-1" />
                {['ALL', ...Object.values(LOG_CATEGORIES)].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      selectedCategory === cat
                        ? 'bg-teal-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setOnlyErrors((prev) => !prev)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors shrink-0 ${
                  onlyErrors
                    ? 'bg-red-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-red-300'
                }`}
              >
                Errors Only ({errorCount + warnCount})
              </button>
            </div>

            {/* Logs Output List */}
            <div
              ref={logContainerRef}
              className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed space-y-1 bg-slate-950/60"
            >
              {filteredLogs.length === 0 ? (
                <div className="text-slate-500 text-center py-16">
                  No logs recorded matching current filter.
                </div>
              ) : (
                filteredLogs.map((entry) => {
                  const isError = entry.level === LOG_LEVELS.ERROR;
                  const isWarn = entry.level === LOG_LEVELS.WARN;
                  const colorClass = CATEGORY_COLORS[entry.category] || 'bg-slate-800 text-slate-300';

                  return (
                    <div
                      key={entry.id}
                      className={`p-1.5 rounded border transition-colors ${
                        isError
                          ? 'bg-red-950/40 border-red-900/60 text-red-200'
                          : isWarn
                          ? 'bg-amber-950/30 border-amber-900/40 text-amber-200'
                          : 'bg-slate-900/40 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="text-slate-500 text-[10px]">{entry.timeStr}</span>
                          <span className="text-slate-600 text-[9px]">{entry.elapsed}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${colorClass}`}
                          >
                            {entry.category}
                          </span>
                        </div>
                        {isError && (
                          <span className="bg-red-800 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                            FAILED
                          </span>
                        )}
                      </div>

                      <div className="mt-1 break-words font-sans text-xs">
                        {entry.message}
                      </div>

                      {entry.data && (
                        <pre className="mt-1.5 p-2 bg-slate-900/90 rounded text-[10px] overflow-x-auto text-slate-300 border border-slate-800/80">
                          {typeof entry.data === 'string'
                            ? entry.data
                            : JSON.stringify(entry.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Summary */}
            <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>
                Total: {logs.length} events | Errors: {errorCount} | Warnings: {warnCount}
              </span>
              <span className="text-slate-500 text-[10px]">
                Production ready: Pass <code className="text-teal-400">?debug=true</code> in URL
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DebugLogsModal;
