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
    <div className="flex-1 flex flex-col justify-center py-6 sm:py-10 px-4 sm:px-6">
      <div className="max-w-2xl w-full mx-auto">

        {/* Loading Progress State */}
        {loading && (
          <IdentifyingProgress
            uploadInfo={uploadInfo}
            progress={uploadProgress}
            onCancel={handleCancel}
          />
        )}

        {/* Clean Hero Search State (zero card box, uncluttered) */}
        {!loading && !results && !error && (
          <AudioUpload
            onUploadStart={handleUploadStart}
            onUploadProgress={handleUploadProgress}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        )}

        {/* Error Display */}
        {error && !loading && (
          <div className="max-w-lg mx-auto my-6 bg-white p-6 rounded-2xl border border-red-200 shadow-xs text-center space-y-3">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-lg">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Identification Issue</h3>
              <p className="text-xs sm:text-sm text-red-600 mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={handleNewSearch}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold py-2 px-5 rounded-xl transition-all shadow-xs cursor-pointer"
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
