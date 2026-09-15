import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import PropTypes from 'prop-types';

const DEFAULT_ACCEPT = {
  'audio/*': ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.webm']
};

const FileUpload = ({ onFileSelect, disabled, accept = DEFAULT_ACCEPT, maxSize = 50 * 1024 * 1024 }) => {
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles && rejectedFiles.length > 0) {
      const error = new Error('Invalid file type or size');
      error.rejectedFiles = rejectedFiles;
      onFileSelect(null, error);
      return;
    }
    
    if (acceptedFiles && acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0], null);
    }
  }, [onFileSelect]);

  const dropzoneAccept = typeof accept === 'string' 
    ? { [accept]: [] } 
    : accept;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: dropzoneAccept,
    maxSize,
    multiple: false,
    disabled,
  });

  return (
    <div 
      {...getRootProps()} 
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${disabled ? 'bg-gray-100 border-gray-300 cursor-not-allowed' : ''}
        ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}
      `}
    >
      <input {...getInputProps()} />
      <div className="space-y-2">
        <div className="flex justify-center">
          <svg 
            className={`h-12 w-12 ${isDragActive ? 'text-indigo-500' : 'text-gray-400'}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">
          {isDragActive ? 'Drop the audio file here' : 'Drag & drop an audio file, or click to select'}
        </h3>
        <p className="text-sm text-gray-500">
          {`Supports ${accept === 'audio/*' ? 'all audio files' : accept.split(',').join(', ')} (max ${maxSize / (1024 * 1024)}MB)`}
        </p>
      </div>
    </div>
  );
};

FileUpload.propTypes = {
  onFileSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  accept: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  maxSize: PropTypes.number,
};

export default FileUpload;
