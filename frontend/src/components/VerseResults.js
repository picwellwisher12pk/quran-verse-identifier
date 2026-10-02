import React, { useState } from 'react';
import AudioPlayer from './AudioPlayer';
import FeedbackForm from './FeedbackForm';
import { apiService } from '../services/api';
import { FiMoreHorizontal, FiCopy, FiCheck, FiBookOpen } from 'react-icons/fi';

// Helper to convert Western digits to Arabic-Indic digits
const toArabicDigits = (num) => {
  if (num === null || num === undefined) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return num
    .toString()
    .split('')
    .map((d) => (/\d/.test(d) ? arabicDigits[parseInt(d, 10)] : d))
    .join('');
};

const VerseResults = ({ results, onNewSearch }) => {
  const [activeFeedbackId, setActiveFeedbackId] = useState(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState({});
  const [feedbackError, setFeedbackError] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [showTransliteration, setShowTransliteration] = useState(false);
  const [translationLang, setTranslationLang] = useState('both'); // 'both' | 'urdu' | 'english'

  // Ground-truth training data collection for fast/normal recitation analysis
  const [groundTruthSurah, setGroundTruthSurah] = useState('');
  const [groundTruthAyah, setGroundTruthAyah] = useState('');
  const [groundTruthPace, setGroundTruthPace] = useState('fast');
  const [groundTruthSubmitting, setGroundTruthSubmitting] = useState(false);
  const [groundTruthSubmitted, setGroundTruthSubmitted] = useState(false);
  const [groundTruthError, setGroundTruthError] = useState(null);

  const handleGroundTruthSubmit = async (e) => {
    e?.preventDefault();
    if (!groundTruthSurah.trim()) {
      setGroundTruthError('Please specify the Surah number or name you were reciting');
      return;
    }
    setGroundTruthSubmitting(true);
    setGroundTruthError(null);
    try {
      await apiService.submitGroundTruth({
        savedFile: results?.file_info?.saved_file,
        surahNumber: groundTruthSurah.trim(),
        ayahNumber: groundTruthAyah.trim(),
        pace: groundTruthPace,
      });
      setGroundTruthSubmitted(true);
    } catch (err) {
      setGroundTruthError('Could not submit feedback. Please check your connection.');
    } finally {
      setGroundTruthSubmitting(false);
    }
  };

  if (!results || !results.matches || results.matches.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 text-center space-y-4">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            🔍
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            No matching verses found
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed text-sm">
            We couldn't identify a matching verse from your recitation. If you were reciting at a normal or fast pace, help us improve recognition!
          </p>

          {/* Ground Truth Submission Form */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 sm:p-5 text-left mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-base">🎙️</span>
              <h4 className="text-sm font-semibold text-slate-800">
                Teach the Model: What verse were you reciting?
              </h4>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Your audio recording has been safely cached. Tagging your intended verse helps us analyze your audio and train fast-recitation detection for mobile users.
            </p>

            {groundTruthSubmitted ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center space-x-2">
                <FiCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Thank you! Your recitation recording has been tagged and queued for acoustic analysis.</span>
              </div>
            ) : (
              <form onSubmit={handleGroundTruthSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Surah Number or Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1 or Al-Fatiha"
                      value={groundTruthSurah}
                      onChange={(e) => setGroundTruthSurah(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Ayah Number (optional)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 1"
                      value={groundTruthAyah}
                      onChange={(e) => setGroundTruthAyah(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Your Recitation Pace
                  </label>
                  <div className="flex items-center space-x-2">
                    {[
                      { key: 'fast', label: '⚡ Fast (Hadr)' },
                      { key: 'normal', label: '⏱️ Normal' },
                      { key: 'tartil', label: '📖 Measured (Tartil)' },
                    ].map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setGroundTruthPace(p.key)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          groundTruthPace === p.key
                            ? 'bg-teal-600 text-white'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {groundTruthError && (
                  <p className="text-xs text-red-600 font-medium">{groundTruthError}</p>
                )}

                <button
                  type="submit"
                  disabled={groundTruthSubmitting}
                  className="w-full sm:w-auto px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {groundTruthSubmitting ? 'Submitting...' : 'Submit Recitation for Analysis'}
                </button>
              </form>
            )}
          </div>

          <button
            onClick={onNewSearch}
            className="btn btn-primary cursor-pointer"
          >
            Try Another Recitation
          </button>
        </div>
      </div>
    );
  }

  const getConfidenceBadge = (confidence) => {
    const percent = Math.round(confidence * 100);
    if (confidence >= 0.8) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          {percent}% Match
        </span>
      );
    }
    if (confidence >= 0.5) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
          {percent}% Match
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
        {percent}% Match
      </span>
    );
  };

  const handleCopyText = (key, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedbackSubmit = async (verseId, wasCorrect, comment, confidence) => {
    setFeedbackError((prev) => ({ ...prev, [verseId]: null }));
    try {
      await apiService.submitFeedback(verseId, wasCorrect, confidence, comment);
      setFeedbackSuccess((prev) => ({ ...prev, [verseId]: true }));
      setActiveFeedbackId(null);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setFeedbackError((prev) => ({
        ...prev,
        [verseId]: 'Failed to submit feedback. Please try again.',
      }));
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Sleek Minimal Header: No clutter */}
      <div className="flex items-center justify-between gap-4 px-1 py-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Matched Verses
          </h2>
          <p className="text-xs text-slate-500">
            {results.matches.length} candidate {results.matches.length === 1 ? 'verse' : 'verses'} found
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          {/* Translation View Mode Filter */}
          <div className="inline-flex items-center p-0.5 bg-slate-100/90 border border-slate-200/80 rounded-full text-xs">
            <button
              type="button"
              onClick={() => setTranslationLang('both')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                translationLang === 'both' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Show all translations"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTranslationLang('urdu')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                translationLang === 'urdu' ? 'bg-white text-emerald-800 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Show Urdu translation only"
            >
              اردو
            </button>
            <button
              type="button"
              onClick={() => setTranslationLang('english')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                translationLang === 'english' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Show English translation only"
            >
              English
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowTransliteration(!showTransliteration)}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <FiBookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>{showTransliteration ? 'Hide Phonetics' : 'Phonetics'}</span>
          </button>

          <button
            type="button"
            onClick={onNewSearch}
            className="inline-flex items-center space-x-1 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <span>New Search</span>
          </button>
        </div>
      </div>

      {/* Compact Diagnostic Metric Cards */}
      <div className="grid grid-cols-3 gap-2 py-0.5 max-w-md mx-auto text-center">
        <div className="py-1 px-2 bg-slate-50/80 border border-slate-200/70 rounded-lg shadow-2xs">
          <div className="text-sm sm:text-base font-bold text-teal-700 leading-tight">
            {results.matches.length}
          </div>
          <div className="text-[9px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
            {results.matches.length === 1 ? 'Candidate' : 'Candidates'}
          </div>
        </div>

        <div className="py-1 px-2 bg-slate-50/80 border border-slate-200/70 rounded-lg shadow-2xs">
          <div className="text-sm sm:text-base font-bold text-slate-800 leading-tight">
            {results.processing_time ? `${results.processing_time.toFixed(2)}s` : '< 0.5s'}
          </div>
          <div className="text-[9px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
            Response Time
          </div>
        </div>

        <div className="py-1 px-2 bg-slate-50/80 border border-slate-200/70 rounded-lg shadow-2xs">
          <div className="text-sm sm:text-base font-bold text-teal-700 leading-tight">
            {results.matches[0] ? `${Math.round(results.matches[0].confidence * 100)}%` : 'N/A'}
          </div>
          <div className="text-[9px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
            Top Match
          </div>
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        {results.matches.map((match, index) => {
          const verse = match.verse;
          const isFeedbackOpen = activeFeedbackId === verse.id;
          const isFeedbackSent = feedbackSuccess[verse.id];
          const isCopied = copiedId === verse.id;

          return (
            <div
              key={verse.id || index}
              style={{ animationDelay: `${index * 80}ms` }}
              className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden transition-all hover:shadow-sm animate-slide-up-fade"
            >
              {/* Card Header: Surah metadata, Revelation Badge & Confidence */}
              <div className="px-5 py-3.5 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex items-baseline space-x-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Surah {verse.surah_name_english || verse.surah_number} : {verse.ayah_number}
                    </h3>
                    {verse.surah_name_arabic && (
                      <span className="font-quran text-base text-teal-800 font-bold">
                        ({verse.surah_name_arabic})
                      </span>
                    )}
                    {verse.revelation_type && (
                      <span className="text-[11px] font-medium text-slate-400">
                        · {verse.revelation_type}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {getConfidenceBadge(match.confidence)}

                  {/* Horizontal More button */}
                  <button
                    type="button"
                    onClick={() => setActiveFeedbackId(isFeedbackOpen ? null : verse.id)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
                    title="Feedback"
                  >
                    <FiMoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card Body: Clean, Uncluttered Typography */}
              <div className="p-5 sm:p-6 space-y-4">
                {/* Authentic Arabic Quranic Scripture (Borderless, breathing room) */}
                <div className="relative group pb-3 sm:pb-4">
                  <div className="flex justify-end pb-1">
                    <button
                      type="button"
                      onClick={() => handleCopyText(`ar-${verse.id}`, verse.arabic_text)}
                      className="inline-flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title="Copy Arabic text"
                    >
                      {copiedId === `ar-${verse.id}` ? (
                        <>
                          <FiCheck className="w-3.5 h-3.5 text-teal-600" />
                          <span className="text-teal-700 font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <FiCopy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p
                    dir="rtl"
                    className="font-quran text-3xl sm:text-4xl text-slate-900 text-right leading-loose select-all pb-2"
                  >
                    {verse.arabic_text}
                    <span className="ayah-end text-teal-700 font-bold mx-2 select-none">
                      ۝{toArabicDigits(verse.ayah_number)}
                    </span>
                  </p>
                </div>

                {/* English Transliteration (Shown if enabled) */}
                {showTransliteration && verse.transliteration && (
                  <p className="text-slate-500 text-xs sm:text-sm italic font-serif leading-relaxed pt-1">
                    "{verse.transliteration}"
                  </p>
                )}

                {/* Urdu Translation */}
                {verse.urdu_translation && (translationLang === 'both' || translationLang === 'urdu') && (
                  <div className="pt-2 sm:pt-3 border-t border-slate-100/90">
                    <div className="flex items-center justify-between pb-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                        اردو ترجمہ
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(`ur-${verse.id}`, verse.urdu_translation)}
                        className="inline-flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        title="Copy Urdu translation"
                      >
                        {copiedId === `ur-${verse.id}` ? (
                          <>
                            <FiCheck className="w-3.5 h-3.5 text-teal-600" />
                            <span className="text-teal-700 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <FiCopy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p
                      dir="rtl"
                      className="font-urdu text-slate-800 text-base sm:text-lg text-right leading-loose select-all"
                    >
                      {verse.urdu_translation}
                    </p>
                  </div>
                )}

                {/* English Translation */}
                {verse.english_translation && (translationLang === 'both' || translationLang === 'english') && (
                  <div className="pt-2 sm:pt-2.5 border-t border-slate-100/80">
                    <div className="flex items-center justify-between pb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
                        English Translation
                      </span>
                    </div>
                    <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                      {verse.english_translation}
                    </p>
                  </div>
                )}

                {/* Reference Audio Player */}
                <div className="pt-3 sm:pt-4">
                  <AudioPlayer
                    surahNumber={verse.surah_number}
                    ayahNumber={verse.ayah_number}
                  />
                </div>

                {/* Feedback Section */}
                {feedbackError[verse.id] && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
                    <span>{feedbackError[verse.id]}</span>
                    <button
                      type="button"
                      onClick={() => setFeedbackError((prev) => ({ ...prev, [verse.id]: null }))}
                      className="text-rose-500 font-bold ml-2 text-sm"
                    >
                      ×
                    </button>
                  </div>
                )}
                {isFeedbackSent ? (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center">
                    <span className="mr-1.5">✓</span> Thank you! Your feedback has been recorded.
                  </div>
                ) : isFeedbackOpen ? (
                  <div className="pt-2">
                    <FeedbackForm
                      verseId={verse.id}
                      onSubmit={(verseId, wasCorrect, comment) =>
                        handleFeedbackSubmit(verseId, wasCorrect, comment, match.confidence)
                      }
                      onCancel={() => setActiveFeedbackId(null)}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VerseResults;