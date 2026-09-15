import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiDownload } from 'react-icons/fi';
import { apiService } from '../services/api';

const Header = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking'); // 'online' | 'offline' | 'checking'

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

  // Heartbeat check for API online indicator
  useEffect(() => {
    let mounted = true;
    const checkApi = async () => {
      try {
        const checkFn = apiService.healthCheck || apiService.getHealth;
        if (checkFn) {
          await checkFn.call(apiService);
        } else {
          // Fallback direct fetch to /api/health
          await fetch('/api/health');
        }
        if (mounted) setApiStatus('online');
      } catch (e) {
        if (mounted) setApiStatus('offline');
      }
    };
    checkApi();
    const interval = setInterval(checkApi, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
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

  return (
    <header className="bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo and Brand: 'QVI' on mobile, full text on desktop */}
          <Link to="/" className="flex items-center space-x-2.5 group">
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

            {/* API Status on Top Right */}
            <div
              className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-full text-xs font-medium text-slate-600 shadow-2xs"
              title={
                apiStatus === 'online'
                  ? 'Backend API Online'
                  : apiStatus === 'offline'
                  ? 'Backend API Offline'
                  : 'Connecting to API...'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  apiStatus === 'online'
                    ? 'bg-emerald-500 animate-pulse'
                    : apiStatus === 'offline'
                    ? 'bg-rose-500'
                    : 'bg-amber-400 animate-ping'
                }`}
              />
              <span className="text-[11px] font-semibold text-slate-700 capitalize">
                {apiStatus === 'online' ? 'Online' : apiStatus === 'offline' ? 'Offline' : 'Connecting'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
