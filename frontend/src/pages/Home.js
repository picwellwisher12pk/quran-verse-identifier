import React, { useState } from 'react';
import AudioUpload from '../components/AudioUpload';
import VerseResults from '../components/VerseResults';

const Home = () => {
  const [results, setResults] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUploadStart = () => {
    setLoading(true);
    setError(null);
    setResults(null);
  };

  const handleUploadSuccess = (uploadResults, file) => {
    setLoading(false);
    setResults(uploadResults);
    setOriginalFile(file);
    setError(null);
  };

  const handleUploadError = (uploadError, file) => {
    setLoading(false);
    setError(uploadError.message || 'An error occurred during upload');
    setResults(null);
    setOriginalFile(file);
  };

  const handleNewSearch = () => {
    setResults(null);
    setOriginalFile(null);
    setError(null);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {!results && !loading && !error && (
          <div className="space-y-12">
            {/* Upload Section */}
            <section>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Upload Your Audio Recording
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Drop your audio file below or click to select. Our AI will analyze
                  the recording and identify the Quran verse being recited.
                </p>
              </div>

              <AudioUpload
                onUploadStart={handleUploadStart}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </section>

            {/* How it Works */}
            <section className="py-16 bg-white rounded-2xl shadow-sm">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  How It Works
                </h2>
                <p className="text-lg text-gray-600">
                  Our advanced audio recognition system uses machine learning to identify verses
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center p-6">
                  <div className="w-16 h-16 bg-islamic-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎤</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    1. Upload Audio
                  </h3>
                  <p className="text-gray-600">
                    Upload your Quran recitation audio file in MP3, WAV, or other supported formats
                  </p>
                </div>

                <div className="text-center p-6">
                  <div className="w-16 h-16 bg-islamic-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🧠</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    2. AI Analysis
                  </h3>
                  <p className="text-gray-600">
                    Our AI extracts audio fingerprints and compares them against our verse database
                  </p>
                </div>

                <div className="text-center p-6">
                  <div className="w-16 h-16 bg-islamic-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">✨</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    3. Get Results
                  </h3>
                  <p className="text-gray-600">
                    Receive the identified verse with Arabic text, translation, and confidence score
                  </p>
                </div>
              </div>
            </section>

            {/* Features */}
            <section>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Powerful Features
                </h2>
                <p className="text-lg text-gray-600">
                  Everything you need for accurate Quran verse identification
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="card p-6">
                  <div className="text-2xl mb-3">🎯</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    High Accuracy
                  </h3>
                  <p className="text-gray-600">
                    Advanced audio fingerprinting ensures accurate verse identification
                  </p>
                </div>

                <div className="card p-6">
                  <div className="text-2xl mb-3">⚡</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Fast Processing
                  </h3>
                  <p className="text-gray-600">
                    Get results in seconds with our optimized recognition algorithms
                  </p>
                </div>

                <div className="card p-6">
                  <div className="text-2xl mb-3">🌍</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Multiple Reciters
                  </h3>
                  <p className="text-gray-600">
                    Trained on various recitation styles for better recognition
                  </p>
                </div>

                <div className="card p-6">
                  <div className="text-2xl mb-3">📱</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Easy Upload
                  </h3>
                  <p className="text-gray-600">
                    Drag-and-drop interface supports multiple audio formats
                  </p>
                </div>

                <div className="card p-6">
                  <div className="text-2xl mb-3">🔒</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Privacy First
                  </h3>
                  <p className="text-gray-600">
                    Your audio files are processed securely and not stored permanently
                  </p>
                </div>

                <div className="card p-6">
                  <div className="text-2xl mb-3">📊</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Detailed Results
                  </h3>
                  <p className="text-gray-600">
                    Get confidence scores and detailed match information
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="max-w-2xl mx-auto">
            <div className="card p-8 border-red-200 bg-red-50">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-red-600 text-xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-800">
                    Upload Error
                  </h3>
                  <p className="text-red-600">{error}</p>
                </div>
              </div>
              <button
                onClick={handleNewSearch}
                className="btn btn-primary"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Results Display */}
        {results && (
          <VerseResults
            results={results}
            originalFile={originalFile}
            onNewSearch={handleNewSearch}
          />
        )}
      </div>
    </div>
  );
};

export default Home;