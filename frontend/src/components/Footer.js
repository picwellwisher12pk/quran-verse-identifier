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
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-700">Quran Verse Identifier</span>
          <span>•</span>
          <span>6,236 Verses Indexed</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">EveryAyah CDN</span>
        </div>

        <div className="flex items-center space-x-2">
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