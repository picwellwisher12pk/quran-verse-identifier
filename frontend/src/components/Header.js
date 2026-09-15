import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <span className="text-white text-lg select-none">📖</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                Quran Verse Identifier
              </h1>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Instant Recitation Recognition
              </p>
            </div>
          </Link>

          {/* Clean status badge */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-full text-xs text-slate-600 font-medium shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Corpus:</span>
            <span className="text-slate-800 font-semibold">6,236 Verses</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;