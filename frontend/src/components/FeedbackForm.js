import React, { useState } from 'react';

const FeedbackForm = ({ verseId, onSubmit, onCancel }) => {
  const [wasCorrect, setWasCorrect] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (wasCorrect === null) {
      setFormError('Please select whether the identification was correct or incorrect.');
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
      setFormError('Failed to submit feedback. Please try again or report via feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3">
        <h4 className="font-semibold text-gray-900 text-sm">
          Help us improve! Was this identification correct?
        </h4>
        <span className="font-urdu text-xs font-semibold text-teal-800 text-right" dir="rtl">
          بہتری میں مدد کریں: کیا یہ آیت درست ہے؟
        </span>
      </div>

      {formError && (
        <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <span>{formError}</span>
          <button
            type="button"
            onClick={() => setFormError('')}
            className="text-rose-500 font-bold ml-2 text-sm"
          >
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Correctness Rating */}
        <div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="correctness"
                value="correct"
                checked={wasCorrect === true}
                onChange={() => setWasCorrect(true)}
                className="mr-2 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs sm:text-sm font-medium text-emerald-700 flex items-center gap-1.5">
                <span>✓ Correct identification</span>
                <span className="font-urdu text-xs" dir="rtl">(درست شناخت)</span>
              </span>
            </label>

            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="correctness"
                value="incorrect"
                checked={wasCorrect === false}
                onChange={() => setWasCorrect(false)}
                className="mr-2 text-red-600 focus:ring-red-500"
              />
              <span className="text-xs sm:text-sm font-medium text-red-700 flex items-center gap-1.5">
                <span>✗ Incorrect identification</span>
                <span className="font-urdu text-xs" dir="rtl">(غلط شناخت)</span>
              </span>
            </label>
          </div>
        </div>

        {/* Additional Comments */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="comment" className="block text-xs sm:text-sm font-medium text-gray-700">
              Additional comments (optional)
            </label>
            <span className="font-urdu text-xs text-slate-500" dir="rtl">
              اضافی رائے (اختیاری)
            </span>
          </div>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows="3"
            className="input w-full text-xs"
            placeholder="Tell us more about the identification accuracy, audio quality, or any other feedback... / تلاوت کی درستگی یا صوتی معیار کے بارے میں تفصیل لکھیں..."
            maxLength="500"
          />
          <p className="text-xs text-gray-500 mt-1">
            {comment.length}/500 characters
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            type="submit"
            disabled={submitting || wasCorrect === null}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {submitting ? (
              <>
                <div className="loading-spinner mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <span>Submit Feedback</span>
                <span className="font-urdu text-xs opacity-90" dir="rtl">(رائے بھیجیں)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="btn btn-outline disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <span>Cancel</span>
            <span className="font-urdu text-xs opacity-90" dir="rtl">(منسوخ)</span>
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