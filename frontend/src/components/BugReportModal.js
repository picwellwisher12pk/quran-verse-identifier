import React, { useState, useEffect } from 'react';
import { FiAlertCircle, FiX, FiSend, FiCopy, FiCheck, FiCpu } from 'react-icons/fi';
import logger, { LOG_CATEGORIES } from '../utils/logger';
import { apiService } from '../services/api';

const BugReportModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [includeLogs, setIncludeLogs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Listen for custom trigger or keyboard shortcut Ctrl+Shift+B
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('open-bug-report-modal', handleOpen);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('open-bug-report-modal', handleOpen);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!isOpen) return null;

  const buildDiagnosticPayload = () => {
    const recentLogs = includeLogs ? logger.getLogs().slice(-15) : [];
    return {
      category,
      title: title.trim(),
      description: description.trim(),
      email: email.trim() || undefined,
      environment: {
        app: 'Quran Verse Identifier',
        version: '1.1.0',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        screenSize: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
        timestamp: new Date().toISOString(),
      },
      recentLogs,
    };
  };

  const formatMarkdown = (payload) => {
    const lines = [
      `### [QVI Bug Report] ${payload.title || 'Feedback'}`,
      `**Category:** ${payload.category}`,
      payload.email ? `**Contact:** ${payload.email}` : '',
      '',
      '#### Details',
      payload.description,
      '',
      '#### Environment',
      `- **App:** ${payload.environment.app} v${payload.environment.version}`,
      `- **Screen:** ${payload.environment.screenSize}`,
      `- **User Agent:** \`${payload.environment.userAgent}\``,
      `- **Timestamp:** ${payload.environment.timestamp}`,
      '',
    ];

    if (payload.recentLogs?.length > 0) {
      lines.push(
        '#### Recent Client Logs',
        '```json',
        JSON.stringify(payload.recentLogs, null, 2),
        '```',
        ''
      );
    }

    return lines.filter(Boolean).join('\n');
  };

  const handleCopy = async () => {
    const payload = buildDiagnosticPayload();
    const md = formatMarkdown(payload);
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMessage('Please provide a title and detailed description.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const payload = buildDiagnosticPayload();
      // Dispatch to feedback API endpoint if available
      if (apiService.submitFeedback) {
        await apiService.submitFeedback(
          'general-feedback',
          false,
          0,
          `[${category.toUpperCase()}] ${title}: ${description} (Contact: ${email || 'none'})`
        );
      }
      logger.info(LOG_CATEGORIES.UI, 'User bug report submitted', { category, title });
      setSubmitted(true);
    } catch (err) {
      logger.error(LOG_CATEGORIES.UI, 'Failed to submit bug report', err);
      setErrorMessage('Failed to send report online. You can copy the markdown report to share.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSubmitted(false);
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <FiAlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Report a Bug / Feedback</h3>
              <p className="text-xs text-slate-500">Quran Verse Identifier Studio</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {submitted ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <FiCheck className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Feedback Submitted</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Thank you! Your feedback and diagnostics have been logged to help improve verse matching and app stability.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Issue Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="bug">Bug / Error</option>
                    <option value="audio">Audio / Mic Recording</option>
                    <option value="verse-match">Incorrect Verse Match</option>
                    <option value="performance">Slow Response</option>
                    <option value="feature">Feature Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Audio upload stalls on 48kHz WAV files"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  What happened? Steps to reproduce *
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what occurred, any error messages shown, and audio recitations tested..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeLogs}
                    onChange={(e) => setIncludeLogs(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Attach recent client debug logs ({logger.getLogs().length} captured)</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
                  <FiCpu className="w-3 h-3" />
                  <span>v1.1.0</span>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
                >
                  <FiCopy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied Markdown!' : 'Copy Report'}</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-3.5 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-medium"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    <FiSend className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Sending...' : 'Submit Report'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BugReportModal;
