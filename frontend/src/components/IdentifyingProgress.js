import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiX, FiCheckCircle } from 'react-icons/fi';

const IdentifyingProgress = ({
  uploadInfo = {},
  progress = 0,
  onCancel,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(15);
  const [currentStage, setCurrentStage] = useState(0);

  const stages = [
    { title: 'Uploading Audio Recitation', desc: 'Transferring audio to recognition pipeline' },
    { title: 'Phonetic Transcription & Acoustic Analysis', desc: 'Extracting speech tokens and acoustic features' },
    { title: 'Corpus Search Across 6,236 Verses', desc: 'Vectorized rapid fuzzy matching in-memory' },
    { title: 'Finalizing Confidence & Calligraphy', desc: 'Retrieving Uthmani text and reciter audio' },
  ];

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => +(prev + 0.1).toFixed(1));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Progress simulation & stage progression
  useEffect(() => {
    // Stage updates based on elapsed time and upload progress
    if (progress > 0 && progress < 100) {
      setDisplayProgress(Math.max(15, Math.round(progress * 0.5)));
      setCurrentStage(0);
    } else {
      // Backend analysis phase
      const interval = setInterval(() => {
        setDisplayProgress((prev) => {
          if (prev >= 92) return 92;
          const increment = prev < 50 ? 5 : prev < 75 ? 3 : 1;
          const next = prev + increment;
          if (next >= 75) setCurrentStage(2);
          else if (next >= 40) setCurrentStage(1);
          return next;
        });
      }, 250);
      return () => clearInterval(interval);
    }
  }, [progress]);

  const isText = uploadInfo?.type === 'text';
  const previewText = uploadInfo?.transcript || uploadInfo?.text;

  return (
    <div className="w-full max-w-xl mx-auto my-8">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8 space-y-6">
        
        {/* Animated Radar Pulse Header */}
        <div className="flex flex-col items-center text-center">
          <div className="relative flex items-center justify-center w-20 h-20 mb-4">
            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-100 opacity-75 animate-ping" />
            <span className="absolute inline-flex h-16 w-16 rounded-full bg-blue-50 border border-blue-200" />
            <div className="relative z-10 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-md text-white text-xl">
              📖
            </div>
          </div>

          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            {isText ? 'Searching Quranic Verses...' : 'Identifying Quran Recitation...'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Matching phonetics across all 114 Surahs and 6,236 Ayahs
          </p>
        </div>

        {/* Live Detected Arabic Snippet Preview */}
        {previewText && (
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 text-center">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block mb-1">
              Matching Spoken Phrase
            </span>
            <p dir="rtl" className="font-quran text-xl text-slate-900 leading-relaxed truncate px-2">
              {previewText}
            </p>
          </div>
        )}

        {/* Progress Bar & Percentage */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-600">
              {stages[currentStage]?.title || 'Processing...'}
            </span>
            <span className="text-blue-700 font-mono">
              {displayProgress}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        </div>

        {/* Analysis Steps Checklist */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          {stages.map((st, index) => {
            const isCompleted = currentStage > index;
            const isCurrent = currentStage === index;
            return (
              <div
                key={index}
                className={`flex items-start space-x-3 text-xs p-2 rounded-lg transition-all ${
                  isCurrent
                    ? 'bg-blue-50/80 text-blue-900 font-medium border border-blue-100'
                    : isCompleted
                    ? 'text-emerald-700'
                    : 'text-slate-400'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : isCurrent ? (
                    <span className="flex h-3.5 w-3.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-600" />
                    </span>
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <span className="font-semibold">{st.title}</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">{st.desc}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with Elapsed Timer & Cancel Button */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-xs font-mono text-slate-500">
            Elapsed: <span className="font-semibold text-slate-700">{elapsedSeconds.toFixed(1)}s</span>
          </span>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 py-1.5 px-3 rounded-lg transition-all font-medium border border-transparent hover:border-red-200"
            >
              <FiX className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

IdentifyingProgress.propTypes = {
  uploadInfo: PropTypes.object,
  progress: PropTypes.number,
  onCancel: PropTypes.func,
};

export default IdentifyingProgress;
