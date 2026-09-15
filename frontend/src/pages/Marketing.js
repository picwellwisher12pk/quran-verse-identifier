import React from 'react';

const Marketing = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-16">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-2 bg-blue-100/70 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full mb-2">
            <span>✨ AI Recitation Recognition</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            How Quran Verse Identifier Works
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Discover the artificial intelligence and acoustic signal processing architecture powering instant Quranic verse identification.
          </p>
        </div>

        {/* How It Works (3 Steps) */}
        <section className="bg-white rounded-2xl shadow-xs border border-slate-200 p-8 sm:p-12">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">Three-Step Recognition Process</h2>
            <p className="text-sm text-slate-500 mt-1">From vocal recording to calligraphy retrieval</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-14 h-14 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                🎤
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">1. Audio Capture</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Stream microphone audio or upload MP3/WAV/WebM recordings with live in-browser speech recognition.
              </p>
            </div>

            <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-14 h-14 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                🧠
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">2. Hybrid AI Fusion</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Acoustic feature extraction combined with phonetic normalization across all 6,236 verses in milliseconds.
              </p>
            </div>

            <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                📖
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">3. Precise Results</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Displays authentic Uthmani Arabic calligraphy, transliteration, English translation, and EveryAyah recitations.
              </p>
            </div>
          </div>
        </section>

        {/* Feature Grid (6 Cards) */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">Key Capabilities</h2>
            <p className="text-sm text-slate-500 mt-1">Built specifically for Quran recitation processing</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-2xl mb-2 block">🎯</span>
              <h4 className="text-base font-bold text-slate-900 mb-1">High Accuracy</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Normalized token matching handles diverse pronunciations and dialect variations smoothly.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-2xl mb-2 block">⚡</span>
              <h4 className="text-base font-bold text-slate-900 mb-1">Ultra-Low Latency</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                In-memory vectorized indexing queries the entire Quran in less than 5 milliseconds.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-2xl mb-2 block">🎙️</span>
              <h4 className="text-base font-bold text-slate-900 mb-1">6 Renowned Qaris</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Seamless audio streaming from Alafasy, Abdul Basit, Minshawi, Husary, Sudais, and Ghamadi.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-2xl mb-2 block">🎛️</span>
              <h4 className="text-base font-bold text-slate-900 mb-1">Microphone Input Choice</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enumerate and choose between multiple connected audio input devices with fallback support.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-2xl mb-2 block">🔒</span>
              <h4 className="text-base font-bold text-slate-900 mb-1">Privacy Preserving</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Recitation audio is processed in memory and never permanently stored or shared.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-2xl mb-2 block">📊</span>
              <h4 className="text-base font-bold text-slate-900 mb-1">Confidence Scoring</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Clear confidence percentages and recognition origin tags (Speech vs Acoustic Alignment).
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Marketing;
