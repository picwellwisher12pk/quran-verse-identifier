import React, { useState } from 'react';

const FeedbackForm = ({ verseId, onSubmit, onCancel }) => {
  const [wasCorrect, setWasCorrect] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (wasCorrect === null) {
      alert('Please indicate whether the identification was correct');
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit(verseId, wasCorrect, comment.trim() || null);
      // Reset form
      setWasCorrect(null);
      setComment('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h4 className="font-semibold text-gray-900 mb-3">
        Help us improve! Was this identification correct?
      </h4>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Correctness Rating */}
        <div>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="correctness"
                value="correct"
                checked={wasCorrect === true}
                onChange={() => setWasCorrect(true)}
                className="mr-2 text-islamic-green-600 focus:ring-islamic-green-500"
              />
              <span className="text-sm font-medium text-green-700">
                ✓ Correct identification
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="radio"
                name="correctness"
                value="incorrect"
                checked={wasCorrect === false}
                onChange={() => setWasCorrect(false)}
                className="mr-2 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm font-medium text-red-700">
                ✗ Incorrect identification
              </span>
            </label>
          </div>
        </div>

        {/* Additional Comments */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
            Additional comments (optional)
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows="3"
            className="input w-full"
            placeholder="Tell us more about the identification accuracy, audio quality, or any other feedback..."
            maxLength="500"
          />
          <p className="text-xs text-gray-500 mt-1">
            {comment.length}/500 characters
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          <button
            type="submit"
            disabled={submitting || wasCorrect === null}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="loading-spinner mr-2"></div>
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="btn btn-outline disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Feedback Impact Info */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-700">
          <strong>Why feedback matters:</strong> Your input helps our AI learn and improve verse identification accuracy.
          All feedback is anonymized and used solely for system enhancement.
        </p>
      </div>
    </div>
  );
};

export default FeedbackForm;