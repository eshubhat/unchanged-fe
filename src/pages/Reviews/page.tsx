import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Star,
  Package,
  Loader2,
  AlertCircle,
  ShoppingBag,
  CheckCircle2,
  Edit3,
  ChevronRight,
} from "lucide-react";
import {
  getMyOrders,
  getMyReview,
  type Order,
  type MyReview,
} from "../../utils/api";
import ReviewModal from "../../components/ReviewModal/ReviewModal";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StarDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= rating ? "fill-amber-400 text-amber-400" : "fill-stone-200 text-stone-200"}
        />
      ))}
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewableItem {
  orderId: string;
  orderNumber: string;
  deliveredAt: string | null;
  orderDate: string;
  itemId: string;
  variantId: string | null;
  productId: string | null;
  productName: string;
  productImage: string | null;
  size: string | null;
  color: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: number;
}

// ─── Item Review Card ─────────────────────────────────────────────────────────

function ItemReviewCard({
  item,
  review,
  onWriteReview,
}: {
  item: ReviewableItem;
  review: MyReview | undefined | null;
  onWriteReview: () => void;
}) {
  const hasReview = !!review;

  return (
    <div className="bg-white border border-stone-200 rounded-sm hover:border-stone-300 hover:shadow-sm transition-all duration-200">
      <div className="flex gap-4 p-4">
        {/* Product image */}
        <div className="w-16 h-20 flex-shrink-0 bg-stone-100 rounded-sm overflow-hidden border border-stone-100">
          {item.productImage ? (
            <img
              src={item.productImage}
              alt={item.productName}
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={20} className="text-stone-300" />
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <p className="font-semibold text-stone-900 text-sm leading-tight line-clamp-2">
            {item.productName}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {item.size && (
              <span className="text-[10px] font-mono bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                {item.size}
              </span>
            )}
            {item.color && (
              <span className="text-[10px] text-stone-500">{item.color}</span>
            )}
            <span className="text-[10px] text-stone-400">Qty: {item.quantity}</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5">
            From order{" "}
            <span className="font-mono font-semibold text-stone-600">{item.orderNumber}</span>
            {" · "}
            {item.deliveredAt ? `Delivered ${fmtDate(item.deliveredAt)}` : fmtDate(item.orderDate)}
          </p>

          {/* Existing review preview */}
          {hasReview && review && (
            <div className="mt-2 flex flex-col gap-1 bg-stone-50 border border-stone-200 rounded-sm px-3 py-2">
              <div className="flex items-center justify-between">
                <StarDisplay rating={review.rating} />
                <span className="text-[10px] text-stone-400">{fmtDate(review.createdAt)}</span>
              </div>
              {review.title && (
                <p className="text-xs font-semibold text-stone-800">{review.title}</p>
              )}
              {review.body && (
                <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">{review.body}</p>
              )}
              {!review.isApproved && (
                <p className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                  <AlertCircle size={10} /> Pending approval
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action button */}
      <div className="px-4 pb-4">
        <button
          id={`review-btn-${item.itemId}`}
          onClick={onWriteReview}
          className={`w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors ${
            hasReview
              ? "border border-stone-300 text-stone-700 hover:bg-stone-50"
              : "bg-stone-900 text-white hover:bg-stone-700"
          }`}
        >
          {hasReview ? (
            <>
              <Edit3 size={13} />
              Edit Review
            </>
          ) : (
            <>
              <Star size={13} />
              Write a Review
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReviewsPage() {
  const [items, setItems] = useState<ReviewableItem[]>([]);
  const [reviews, setReviews] = useState<Record<string, MyReview | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalItem, setModalItem] = useState<ReviewableItem | null>(null);

  // Flatten all delivered order items into reviewable items
  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMyOrders({ status: "delivered", limit: 50 });
      const deliveredOrders: Order[] = result?.data ?? [];

      const flat: ReviewableItem[] = [];
      for (const order of deliveredOrders) {
        for (const item of order.items ?? []) {
          const snap = item.productSnapshot;
          if (!snap?.productId) continue;
          flat.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            deliveredAt: order.deliveredAt ?? null,
            orderDate: order.createdAt,
            itemId: item.id,
            variantId: item.variantId,
            productId: snap.productId,
            productName: snap.productName ?? "Unknown Product",
            productImage: snap.primaryImageUrl ?? null,
            size: snap.size ?? null,
            color: snap.color ?? null,
            sku: snap.sku ?? null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          });
        }
      }

      // De-duplicate by productId — one review slot per product regardless of how many times ordered
      const seen = new Set<string>();
      const unique = flat.filter((i) => {
        if (!i.productId || seen.has(i.productId)) return false;
        seen.add(i.productId);
        return true;
      });

      setItems(unique);

      // Fetch each product's existing review in parallel
      const reviewResults = await Promise.allSettled(
        unique.map((i) => getMyReview(i.productId!))
      );
      const reviewMap: Record<string, MyReview | null> = {};
      for (let idx = 0; idx < unique.length; idx++) {
        const item = unique[idx];
        const result = reviewResults[idx];
        reviewMap[item.productId!] =
          result.status === "fulfilled" ? result.value : null;
      }
      setReviews(reviewMap);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load your orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadItems();
  }, [loadItems]);

  const handleReviewSaved = (productId: string, saved: MyReview | null) => {
    setReviews((prev) => ({ ...prev, [productId]: saved }));
    setModalItem(null);
  };

  // Separate reviewed from not-yet-reviewed
  const notReviewed = items.filter((i) => !reviews[i.productId!]);
  const reviewed = items.filter((i) => !!reviews[i.productId!]);

  return (
    <div className="min-h-screen bg-[#fcf9f0] pt-32 pb-24 px-6 md:px-12 font-sans text-stone-900">
      <div className="max-w-2xl mx-auto flex flex-col gap-12">

        {/* ── Header ── */}
        <div className="flex flex-col gap-5">
          <Link
            to="/orders"
            className="text-stone-500 hover:text-stone-900 text-sm font-medium uppercase tracking-wider transition-colors self-start"
          >
            &larr; My Orders
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl md:text-5xl font-serif font-medium uppercase tracking-tight text-stone-900">
              Your Reviews
            </h1>
            <p className="text-stone-500 text-sm leading-relaxed">
              Share your experience with each piece you've received.
            </p>
          </div>

          {/* Stats bar */}
          {!loading && items.length > 0 && (
            <div className="flex items-center gap-6 py-3 border-t border-b border-stone-200">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400">
                  Products Received
                </span>
                <span className="text-xl font-bold text-stone-900">{items.length}</span>
              </div>
              <div className="w-px h-8 bg-stone-200" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400">
                  Reviewed
                </span>
                <span className="text-xl font-bold text-emerald-700">{reviewed.length}</span>
              </div>
              <div className="w-px h-8 bg-stone-200" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400">
                  Pending
                </span>
                <span className="text-xl font-bold text-amber-600">{notReviewed.length}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center gap-4 py-20">
            <Loader2 size={28} className="animate-spin text-stone-400" />
            <p className="text-sm text-stone-400 uppercase tracking-widest font-medium">
              Loading your orders…
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-sm px-4 py-3">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center gap-6 py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
              <ShoppingBag size={24} className="text-stone-400" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-stone-800">No delivered orders yet</p>
              <p className="text-sm text-stone-500 max-w-xs">
                Once an order is delivered, you'll be able to leave a review for each piece here.
              </p>
            </div>
            <Link
              to="/"
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-stone-900 border border-stone-900 px-5 py-2.5 hover:bg-stone-900 hover:text-white transition-colors"
            >
              Shop Now <ChevronRight size={14} />
            </Link>
          </div>
        )}

        {/* ── Pending reviews ── */}
        {!loading && notReviewed.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-stone-900">
                Awaiting Your Review
              </h2>
              <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                {notReviewed.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {notReviewed.map((item) => (
                <ItemReviewCard
                  key={item.itemId}
                  item={item}
                  review={reviews[item.productId!]}
                  onWriteReview={() => setModalItem(item)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Already reviewed ── */}
        {!loading && reviewed.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-stone-900">
                Your Reviews
              </h2>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                {reviewed.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {reviewed.map((item) => (
                <ItemReviewCard
                  key={item.itemId}
                  item={item}
                  review={reviews[item.productId!]}
                  onWriteReview={() => setModalItem(item)}
                />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── Review Modal ── */}
      {modalItem && (
        <ReviewModal
          productId={modalItem.productId!}
          productName={modalItem.productName}
          productImage={modalItem.productImage}
          existingReview={reviews[modalItem.productId!]}
          onClose={() => setModalItem(null)}
          onSaved={(saved) => handleReviewSaved(modalItem.productId!, saved)}
        />
      )}
    </div>
  );
}
