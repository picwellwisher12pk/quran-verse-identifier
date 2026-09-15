import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

const Footer = () => {
  const [apiStatus, setApiStatus] = useState('unknown');
  const [version, setVersion] = useState(null);

  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      await apiService.getHealth();
      setApiStatus('online');

      try {
        const versionData = await apiService.getVersion();
        setVersion(versionData);
      } catch (error) {
        console.warn('Could not fetch version info:', error.message);
      }
    } catch (error) {
      setApiStatus('offline');
    }
  };

  const getStatusColor = () => {
    switch (apiStatus) {
      case 'online':
        return 'text-green-500';
      case 'offline':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (apiStatus) {
      case 'online':
        return 'API Online';
      case 'offline':
        return 'API Offline';
      default:
        return 'Checking...';
    }
  };

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Project Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Quran Verse Identifier
            </h3>
            <p className="text-sm text-gray-600">
              Advanced audio fingerprinting technology for identifying Quran verses
              from audio recordings. Built with modern web technologies and powered
              by machine learning.
            </p>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
              <span className="text-sm text-gray-500">{getStatusText()}</span>
              {version && (
                <span className="text-xs text-gray-400">
                  v{version.version}
                </span>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Features</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-center space-x-2">
                <span>🎵</span>
                <span>Audio fingerprinting technology</span>
              </li>
              <li className="flex items-center space-x-2">
                <span>📱</span>
                <span>Drag-and-drop file upload</span>
              </li>
              <li className="flex items-center space-x-2">
                <span>🔍</span>
                <span>High-accuracy verse identification</span>
              </li>
              <li className="flex items-center space-x-2">
                <span>📖</span>
                <span>Arabic text with translations</span>
              </li>
              <li className="flex items-center space-x-2">
                <span>📊</span>
                <span>Real-time statistics</span>
              </li>
            </ul>
          </div>

          {/* Technical Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Technology</h3>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <strong>Backend:</strong> Python FastAPI, librosa
              </div>
              <div className="text-sm text-gray-600">
                <strong>Frontend:</strong> React, Tailwind CSS
              </div>
              <div className="text-sm text-gray-600">
                <strong>Database:</strong> SQLite
              </div>
              <div className="text-sm text-gray-600">
                <strong>Audio Source:</strong> EveryAyah.com
              </div>
            </div>

            {/* Audio format support */}
            <div className="text-xs text-gray-500">
              <div className="font-medium mb-1">Supported Formats:</div>
              <div>MP3, WAV, FLAC, M4A, AAC</div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="text-sm text-gray-500">
              Built with ❤️ for the Muslim community
            </div>
            <div className="text-sm text-gray-500 mt-2 sm:mt-0">
              © {new Date().getFullYear()} Quran Verse Identifier.
              Educational use only.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;