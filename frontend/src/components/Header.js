import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiDownload, FiAlertCircle } from 'react-icons/fi';
import logger, { LOG_CATEGORIES } from '../utils/logger';

const Header = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // PWA install prompt handler
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleLogoClick = (e) => {
    e.preventDefault();
    logger.info(LOG_CATEGORIES.UI, 'Logo clicked -> Resetting all app states to clean home');
    // Dispatch global custom event so mounted views (Home, AudioUpload) cleanly cancel and reset state
    window.dispatchEvent(new CustomEvent('app:reset'));
    if (window.location.pathname !== '/' || window.location.search || window.location.hash) {
      navigate('/');
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo and Brand: Click to reset everything back to initial state */}
          <Link
            to="/"
            onClick={handleLogoClick}
            title="Reset to home"
            className="flex items-center space-x-2.5 group cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-teal-600 rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <span className="text-white text-base sm:text-lg select-none">📖</span>
            </div>
            <div className="flex items-baseline space-x-1.5">
              {/* Short QVI for mobile */}
              <span className="text-lg font-bold text-slate-900 tracking-tight sm:hidden">
                QVI
              </span>
              {/* Full title for desktop */}
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight hidden sm:block">
                Quran Verse Identifier
              </h1>
            </div>
          </Link>

          {/* Right Header Controls: Install Icon & API Status */}
          <div className="flex items-center space-x-2">
            {/* Install Button / Icon */}
            {isInstallable && (
              <button
                type="button"
                onClick={handleInstallClick}
                aria-label="Install App"
                className="inline-flex items-center space-x-1 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Install QVI on your home screen"
              >
                <FiDownload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Install App</span>
              </button>
            )}

            {/* Feedback / Bug Report Button */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-bug-report-modal'))}
              className="inline-flex items-center space-x-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer"
              title="Report a bug or give feedback (Ctrl+Shift+B)"
            >
              <FiAlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">Feedback</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
