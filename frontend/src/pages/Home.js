import React, { useState } from 'react';
import AudioUpload from '../components/AudioUpload';
import VerseResults from '../components/VerseResults';
import IdentifyingProgress from '../components/IdentifyingProgress';
import { apiService } from '../services/api';

const Home = () => {
  const [results, setResults] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadInfo, setUploadInfo] = useState({});
  const [error, setError] = useState(null);

  const handleUploadStart = (info = {}) => {
    setLoading(true);
    setUploadInfo(info);
    setUploadProgress(0);
    setError(null);
    setResults(null);
  };

  const handleUploadProgress = (percent) => {
    setUploadProgress(percent);
  };

  const handleUploadSuccess = (uploadResults, file) => {
    setLoading(false);
    setResults(uploadResults);
    setOriginalFile(file);
    setError(null);
  };

  const handleUploadError = (uploadError, file) => {
    setLoading(false);
    setError(uploadError?.message || 'An error occurred while identifying the verse.');
    setResults(null);
    setOriginalFile(file);
  };

  const handleCancel = () => {
    apiService.cancelAllRequests();
    setLoading(false);
    setError(null);
  };

  const handleNewSearch = () => {
    setResults(null);
    setOriginalFile(null);
    setError(null);
    setLoading(false);
  };

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Main Content Sections */}
        {loading && (
          <IdentifyingProgress
            uploadInfo={uploadInfo}
            progress={uploadProgress}
            onCancel={handleCancel}
          />
        )}

        {!loading && !results && !error && (
          <div className="space-y-6">
            {/* Header Title */}
            <div className="text-center max-w-xl mx-auto mb-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Identify Any Quran Verse
              </h2>
              <p className="text-sm sm:text-base text-slate-500 mt-2">
                Recite via microphone, upload an audio clip, or type Arabic words to identify the Surah and Ayah.
              </p>
            </div>

            {/* Audio Upload Component */}
            <AudioUpload
              onUploadStart={handleUploadStart}
              onUploadProgress={handleUploadProgress}
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          </div>
        )}

        {/* Error Display */}
        {error && !loading && (
          <div className="max-w-xl mx-auto my-8 bg-white p-6 sm:p-8 rounded-2xl border border-red-200 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Identification Failed</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={handleNewSearch}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-6 rounded-xl transition-all shadow-xs"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Results Display */}
        {results && !loading && (
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