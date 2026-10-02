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
    <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 text-center sm:text-left">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-700">Quran Verse Identifier</span>
          <span>•</span>
          <span>6,236 Verses Indexed</span>
        </div>

        <div className="flex items-center space-x-1.5 flex-wrap justify-center leading-relaxed">
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
            className="font-medium text-teal-700 hover:underline"
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

        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-full shadow-2xs">
          <span
            className={`w-2 h-2 rounded-full ${
              apiStatus === 'online'
                ? 'bg-emerald-500'
                : apiStatus === 'offline'
                ? 'bg-red-500'
                : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span className="font-medium text-slate-600">
            {apiStatus === 'online' ? 'API Online' : apiStatus === 'offline' ? 'API Offline' : 'Connecting...'}
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;