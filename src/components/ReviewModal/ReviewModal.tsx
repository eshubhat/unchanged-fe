import { useState, useEffect } from "react";
import { X, Star, Loader2, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import {
  createReview,
  updateReview,
  deleteReview,
  type MyReview,
} from "../../utils/api";

interface ReviewModalProps {
  productId: string;
  productName: string;
  productImage?: string | null;
  existingReview?: MyReview | null;
  onClose: () => void;
  onSaved: (review: MyReview | null) => void; // null = deleted
}

export default function ReviewModal({
  productId,
  productName,
  productImage,
  existingReview,
  onClose,
  onSaved,
}: ReviewModalProps) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState(existingReview?.title ?? "");
  const [body, setBody] = useState(existingReview?.body ?? "");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEditing = !!existingReview;
  const BODY_MAX = 2000;
  const effectiveRating = hoverRating || rating;

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const starLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      let saved: MyReview;
      if (isEditing) {
        saved = await updateReview(existingReview.id, {
          rating,
          title: title.trim() || undefined,
          body: body.trim() || undefined,
        });
      } else {
        saved = await createReview(productId, {
          rating,
          title: title.trim() || undefined,
          body: body.trim() || undefined,
        });
      }
      onSaved(saved);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReview || !confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deleteReview(existingReview.id);
      onSaved(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete review.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center px-0 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal panel */}
      <div className="relative bg-white w-full sm:rounded-sm sm:max-w-lg shadow-2xl z-10 flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-200 flex-shrink-0">
          {productImage && (
            <img
              src={productImage}
              alt={productName}
              className="w-10 h-12 object-cover rounded-sm border border-stone-100 flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">
              {isEditing ? "Edit Review" : "Write a Review"}
            </p>
            <p className="font-semibold text-stone-900 text-sm truncate">{productName}</p>
          </div>
          <button
            id="review-modal-close"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-800 transition-colors p-1 flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5 flex flex-col gap-6" data-lenis-prevent="true">

          {/* ── Star Rating ── */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-500">
              Your Rating <span className="text-red-400">*</span>
            </p>
            <div
              className="flex gap-1"
              onMouseLeave={() => setHoverRating(0)}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  id={`star-${star}`}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onClick={() => { setRating(star); setError(null); }}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    size={32}
                    className={`transition-colors ${
                      star <= effectiveRating
                        ? "fill-amber-400 text-amber-400"
                        : "text-stone-200 fill-stone-200"
                    }`}
                  />
                </button>
              ))}
            </div>
            {effectiveRating > 0 && (
              <p className="text-sm font-semibold text-stone-700 h-5 transition-all">
                {starLabels[effectiveRating]}
              </p>
            )}
            {effectiveRating === 0 && <p className="h-5" />}
          </div>

          {/* ── Title ── */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-stone-500">
              Review Title{" "}
              <span className="text-stone-300 font-normal normal-case">(optional)</span>
            </label>
            <input
              id="review-title"
              type="text"
              maxLength={255}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarise your experience in a line…"
              className="w-full border border-stone-300 px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-black transition-colors rounded-sm bg-stone-50"
            />
          </div>

          {/* ── Body ── */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-widest text-stone-500">
                Your Review{" "}
                <span className="text-stone-300 font-normal normal-case">(optional)</span>
              </label>
              <span className={`text-[10px] font-mono ${body.length > BODY_MAX * 0.9 ? "text-orange-500" : "text-stone-400"}`}>
                {body.length}/{BODY_MAX}
              </span>
            </div>
            <textarea
              id="review-body"
              rows={5}
              maxLength={BODY_MAX}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tell other shoppers about the quality, fit, and your honest experience…"
              className="w-full border border-stone-300 px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-black transition-colors resize-none rounded-sm bg-stone-50 leading-relaxed"
            />
          </div>

          {/* ── Verified badge ── */}
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-sm px-3 py-2">
            <CheckCircle2 size={14} className="flex-shrink-0" />
            <p className="text-xs font-medium">
              This review will be marked as a <strong>Verified Purchase</strong>.
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1.5">
              <AlertCircle size={12} className="flex-shrink-0" />
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-stone-200 flex flex-col gap-3 flex-shrink-0 bg-white">
          {/* Delete confirmation */}
          {isEditing && confirmDelete && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-sm px-3 py-2">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-700 flex-1">Are you sure? This cannot be undone.</p>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-stone-500 hover:text-stone-800 font-medium"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="flex gap-3">
            {isEditing && (
              <button
                id="review-delete-btn"
                onClick={handleDelete}
                disabled={deleting}
                className={`flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors disabled:opacity-60 ${
                  confirmDelete
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "border border-stone-300 text-stone-600 hover:border-red-400 hover:text-red-600"
                }`}
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {confirmDelete ? "Confirm Delete" : "Delete"}
              </button>
            )}

            <button
              id="review-cancel-btn"
              onClick={onClose}
              className="flex-1 border border-stone-300 text-stone-700 py-2.5 text-sm font-semibold hover:bg-stone-50 transition-colors rounded-sm"
            >
              Cancel
            </button>

            <button
              id="review-submit-btn"
              onClick={handleSubmit}
              disabled={loading || rating === 0}
              className="flex-1 bg-stone-900 text-white py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-stone-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded-sm"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Saving…" : isEditing ? "Update Review" : "Submit Review"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
