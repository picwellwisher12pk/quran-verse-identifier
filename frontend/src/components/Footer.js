import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

const Footer = () => {
  const [apiStatus, setApiStatus] = useState('checking');

  useEffect(() => {
    let isMounted = true;
    const checkApiStatus = async () => {
      try {
        await apiService.getHealth();
        if (isMounted) setApiStatus('online');
      } catch (error) {
        if (isMounted) setApiStatus('offline');
      }
    };
    checkApiStatus();
    const interval = setInterval(checkApiStatus, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <footer className="bg-white border-t border-slate-200 mt-auto pt-2.5 pb-4">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2 text-xs text-slate-500">
        {/* Tier 1 (Line 1): Brand & API Status - Fully visible in initial peek */}
        <div className="flex items-center justify-between gap-3 text-slate-600">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-800">Quran Verse Identifier</span>
            <span>•</span>
            <span>6,236 Verses Indexed</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-0.5 rounded-full shadow-2xs shrink-0">
            <span
              className={`w-2 h-2 rounded-full ${
                apiStatus === 'online'
                  ? 'bg-emerald-500'
                  : apiStatus === 'offline'
                  ? 'bg-red-500'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="font-medium text-[11px] text-slate-600">
              {apiStatus === 'online' ? 'API Online' : apiStatus === 'offline' ? 'API Offline' : 'Connecting...'}
            </span>
          </div>
        </div>

        {/* Tier 2 (Line 2): Credits & Links - Top half peeks at bottom of viewport, scroll reveals fully */}
        <div className="flex items-center space-x-1.5 flex-wrap justify-center sm:justify-start leading-relaxed pt-1 border-t border-slate-100/90 text-slate-500">
          <span>
            Made with ❤️ by{' '}
            <a
              href="https://amirhameed.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-800 hover:text-teal-700 hover:underline"
            >
              Amir Hameed
            </a>
          </span>
          <span>•</span>
          <a
            href="https://amirhameed.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-teal-700 hover:underline"
          >
            amirhameed.com
          </a>
          <span>•</span>
          <a href="tel:03224228530" className="hover:text-teal-700 hover:underline">
            03224228530
          </a>
          <span>•</span>
          <a href="mailto:me@amirhameed.com" className="hover:text-teal-700 hover:underline">
            me@amirhameed.com
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;