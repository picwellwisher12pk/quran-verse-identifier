import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

const Statistics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getStatistics();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalVerses = stats?.total_verses ?? 0;
  const versesWithAudio = stats?.verses_with_audio ?? stats?.fingerprinted_verses ?? 0;
  const totalSurahs = stats?.total_surahs ?? 114;
  const coverage = stats?.coverage_percentage ?? (totalVerses > 0 ? (versesWithAudio / totalVerses) * 100 : 0);
  const pendingVerses = Math.max(0, totalVerses - versesWithAudio);

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="loading-spinner w-12 h-12 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900">
              Loading Statistics...
            </h2>
            <p className="text-gray-600">Fetching database information</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="card p-8 border-red-200 bg-red-50 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
              <h2 className="text-xl font-semibold text-red-800 mb-2">
                Error Loading Statistics
              </h2>
              <p className="text-red-600 mb-6">{error}</p>
              <button
                onClick={fetchStatistics}
                className="btn btn-primary"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-islamic-green-500 to-islamic-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Database Statistics
            </h1>
            <p className="text-xl opacity-90">
              Current state of our Quran verse identification database
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {stats && (
          <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="stats-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-islamic-green-100 text-sm font-medium">
                      Total Surahs
                    </p>
                    <p className="text-3xl font-bold text-white">
                      {totalSurahs}
                    </p>
                  </div>
                  <div className="text-4xl opacity-80">📚</div>
                </div>
              </div>

              <div className="stats-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-islamic-green-100 text-sm font-medium">
                      Total Verses
                    </p>
                    <p className="text-3xl font-bold text-white">
                      {totalVerses.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-4xl opacity-80">📖</div>
                </div>
              </div>

              <div className="stats-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-islamic-green-100 text-sm font-medium">
                      With Audio
                    </p>
                    <p className="text-3xl font-bold text-white">
                      {versesWithAudio.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-4xl opacity-80">🎵</div>
                </div>
              </div>

              <div className="stats-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-islamic-green-100 text-sm font-medium">
                      Coverage
                    </p>
                    <p className="text-3xl font-bold text-white">
                      {coverage.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-4xl opacity-80">📊</div>
                </div>
              </div>
            </div>

            {/* Coverage Progress */}
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Audio Coverage Progress
              </h2>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Verses with Audio Fingerprints
                    </span>
                    <span className="text-sm text-gray-600">
                      {versesWithAudio} / {totalVerses}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${coverage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span className="font-medium">{coverage.toFixed(1)}%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center mb-2">
                      <span className="text-green-600 text-xl mr-2">✓</span>
                      <h3 className="font-semibold text-green-800">
                        Available for Recognition
                      </h3>
                    </div>
                    <p className="text-2xl font-bold text-green-600 mb-1">
                      {versesWithAudio.toLocaleString()}
                    </p>
                    <p className="text-sm text-green-700">
                      Verses that can be identified from audio
                    </p>
                  </div>

                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center mb-2">
                      <span className="text-orange-600 text-xl mr-2">⏳</span>
                      <h3 className="font-semibold text-orange-800">
                        Pending Processing
                      </h3>
                    </div>
                    <p className="text-2xl font-bold text-orange-600 mb-1">
                      {pendingVerses.toLocaleString()}
                    </p>
                    <p className="text-sm text-orange-700">
                      Verses waiting for audio fingerprinting
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* System Information */}
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                System Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">
                      Database Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Updated:</span>
                        <span className="font-medium">
                          {formatDate(stats.last_updated)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Database Type:</span>
                        <span className="font-medium">SQLite</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Audio Source:</span>
                        <span className="font-medium">EveryAyah.com</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">
                      Recognition Technology
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Algorithm:</span>
                        <span className="font-medium">Audio Fingerprinting</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Features:</span>
                        <span className="font-medium">MFCC, Spectral, Chroma</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Min Confidence:</span>
                        <span className="font-medium">30%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Quality Insights */}
            <div className="card p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Data Quality Insights
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <div className="text-3xl mb-2">🎯</div>
                  <h3 className="font-semibold text-blue-800 mb-2">
                    Recognition Accuracy
                  </h3>
                  <p className="text-sm text-blue-600">
                    High-quality audio fingerprints enable accurate verse identification
                    with confidence scores above 80% for most matches.
                  </p>
                </div>

                <div className="text-center p-6 bg-purple-50 rounded-lg">
                  <div className="text-3xl mb-2">⚡</div>
                  <h3 className="font-semibold text-purple-800 mb-2">
                    Fast Processing
                  </h3>
                  <p className="text-sm text-purple-600">
                    Optimized algorithms process audio files and return
                    identification results typically within 5-15 seconds.
                  </p>
                </div>

                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <div className="text-3xl mb-2">🔄</div>
                  <h3 className="font-semibold text-green-800 mb-2">
                    Continuous Updates
                  </h3>
                  <p className="text-sm text-green-600">
                    The database is regularly updated with new audio fingerprints
                    to improve coverage and recognition accuracy.
                  </p>
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <div className="text-center">
              <button
                onClick={fetchStatistics}
                className="btn btn-primary"
              >
                🔄 Refresh Statistics
              </button>
              <p className="text-sm text-gray-500 mt-2">
                Statistics are updated in real-time as new audio files are processed
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Statistics;