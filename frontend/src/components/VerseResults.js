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
  const [copiedId, setCopiedId] = useState(null);
  const [showTransliteration, setShowTransliteration] = useState(true);

  if (!results || !results.matches || results.matches.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            🔍
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            No matching verses found
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
            We couldn't identify a matching verse from your audio recording or transcript. Try reciting or recording closer to the microphone, or type the Arabic text directly.
          </p>
          <button
            onClick={onNewSearch}
            className="btn btn-primary"
          >
            Try Another Recording or Search
          </button>
        </div>
      </div>
    );
  }

  const getConfidenceBadge = (confidence) => {
    const percent = Math.round(confidence * 100);
    if (confidence >= 0.8) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          {percent}% Match (High)
        </span>
      );
    }
    if (confidence >= 0.5) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          {percent}% Match (Moderate)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
        {percent}% Match
      </span>
    );
  };

  const getSourceBadge = (source) => {
    switch (source) {
      case 'hybrid':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            ⚡ Hybrid Intelligence
          </span>
        );
      case 'speech_recognition':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            🎙️ Speech Recognition
          </span>
        );
      case 'acoustic_dtw':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            🎵 Acoustic Alignment
          </span>
        );
    }
  };

  const handleCopyArabic = (verseId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(verseId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedbackSubmit = async (verseId, wasCorrect, comment, confidence) => {
    try {
      await apiService.submitFeedback(verseId, wasCorrect, confidence, comment);
      setFeedbackSuccess((prev) => ({ ...prev, [verseId]: true }));
      setActiveFeedbackId(null);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Results Summary Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Identification Results
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Matched against complete authentic Quran Uthmani scripture
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setShowTransliteration(!showTransliteration)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <FiBookOpen className="w-3.5 h-3.5" />
              <span>{showTransliteration ? 'Hide Transliteration' : 'Show Transliteration'}</span>
            </button>

            <button
              onClick={onNewSearch}
              className="btn btn-outline"
            >
              New Search
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 text-center">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <div className="text-2xl font-bold text-emerald-700">
              {results.matches.length}
            </div>
            <div className="text-xs text-emerald-800 font-medium mt-0.5">
              {results.matches.length === 1 ? 'Candidate Verse' : 'Candidate Verses'}
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-xl">
            <div className="text-2xl font-bold text-blue-700">
              {results.processing_time ? `${results.processing_time.toFixed(2)}s` : '< 0.5s'}
            </div>
            <div className="text-xs text-blue-800 font-medium mt-0.5">Response Time</div>
          </div>

          <div className="p-3 bg-purple-50 rounded-xl col-span-2 sm:col-span-1">
            <div className="text-2xl font-bold text-purple-700">
              {results.matches[0] ? `${Math.round(results.matches[0].confidence * 100)}%` : 'N/A'}
            </div>
            <div className="text-xs text-purple-800 font-medium mt-0.5">Top Match Confidence</div>
          </div>
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-6">
        {results.matches.map((match, index) => {
          const verse = match.verse;
          const isFeedbackOpen = activeFeedbackId === verse.id;
          const isFeedbackSent = feedbackSuccess[verse.id];
          const isCopied = copiedId === verse.id;

          return (
            <div
              key={verse.id || index}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md"
            >
              {/* Card Header: Surah metadata, Revelation Badge & Confidence */}
              <div className="p-5 bg-gradient-to-r from-slate-50 via-gray-50 to-white border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {verse.surah_name_english || `Surah ${verse.surah_number}`} : {verse.ayah_number}
                      </h3>
                      {verse.surah_name_arabic && (
                        <span className="font-quran text-lg text-emerald-800 font-bold mr-1">
                          ({verse.surah_name_arabic})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-0.5">
                      {verse.revelation_type && (
                        <span className="inline-flex items-center text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {verse.revelation_type === 'Meccan' ? '🕋 Meccan' : '🕌 Medinan'}
                        </span>
                      )}
                      {getSourceBadge(match.recognition_source)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {getConfidenceBadge(match.confidence)}

                  {/* Horizontal More button */}
                  <button
                    type="button"
                    onClick={() => setActiveFeedbackId(isFeedbackOpen ? null : verse.id)}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Provide feedback on this match"
                  >
                    <FiMoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-6">
                {/* Authentic Arabic Quranic Calligraphy */}
                <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-200/60 relative group">
                  <div className="absolute top-3 left-3 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleCopyArabic(verse.id, verse.arabic_text)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white/90 text-amber-900 hover:bg-white border border-amber-200 shadow-2xs transition-all"
                      title="Copy Arabic text"
                    >
                      {isCopied ? (
                        <>
                          <FiCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
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
                    className="font-quran text-3xl sm:text-4xl text-slate-900 text-right leading-loose select-all pt-2"
                  >
                    {verse.arabic_text}
                    <span className="ayah-end text-amber-700 font-bold mx-2">
                      ۝{toArabicDigits(verse.ayah_number)}
                    </span>
                  </p>
                </div>

                {/* English Transliteration (Pronunciation Guide) */}
                {showTransliteration && verse.transliteration && (
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center space-x-1">
                      <span>Phonetic Transliteration</span>
                    </div>
                    <p className="text-slate-800 text-base italic font-serif leading-relaxed">
                      "{verse.transliteration}"
                    </p>
                  </div>
                )}

                {/* English Translation (Saheeh International) */}
                {verse.english_translation && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      English Translation (Saheeh International)
                    </h4>
                    <p className="text-slate-800 text-base leading-relaxed">
                      {verse.english_translation}
                    </p>
                  </div>
                )}

                {/* Reference Audio Player with Multi-Reciter Selection */}
                <div className="pt-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Listen to Reference Recitation
                  </h4>
                  <AudioPlayer
                    surahNumber={verse.surah_number}
                    ayahNumber={verse.ayah_number}
                  />
                </div>

                {/* Feedback Section */}
                {isFeedbackSent ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm flex items-center">
                    <span className="mr-2">✓</span> Thank you! Your feedback has been recorded.
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

      {/* Bottom Action */}
      <div className="text-center pt-4">
        <button
          onClick={onNewSearch}
          className="btn btn-primary px-8 py-3 text-base shadow-sm"
        >
          Identify Another Verse
        </button>
      </div>
    </div>
  );
};

export default VerseResults;