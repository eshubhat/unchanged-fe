import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  getMyOrders,
  getMyOrder,
  cancelOrder,
  type Order,
  type PaginatedOrders,
  type ProductSnapshot,
} from "../../utils/api";
import {
  Package,
  ChevronRight,
  X,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ExternalLink,
  MapPin,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  XCircle,
  RefreshCcw,
  ShoppingBag,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Processing", value: "processing" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Returned", value: "returned" },
];

const SORT_OPTIONS = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Price: Low to High", value: "total_asc" },
  { label: "Price: High to Low", value: "total_desc" },
];

const CANCELLABLE_STATUSES = new Set(["pending", "confirmed"]);

// ─── Status Styling ───────────────────────────────────────────────────────────

function getStatusStyle(status: string): { bg: string; text: string; dot: string } {
  switch (status) {
    case "pending": return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" };
    case "confirmed": return { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" };
    case "processing": return { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-400" };
    case "shipped": return { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-400" };
    case "out_for_delivery": return { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" };
    case "delivered": return { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" };
    case "cancelled": return { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" };
    case "returned": return { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-400" };
    case "refunded": return { bg: "bg-teal-50", text: "text-teal-700", dot: "bg-teal-400" };
    default: return { bg: "bg-stone-100", text: "text-stone-600", dot: "bg-stone-400" };
  }
}

function StatusBadge({ status }: { status: string }) {
  const s = getStatusStyle(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Timeline icon per status ─────────────────────────────────────────────────

function TimelineIcon({ status }: { status: string }) {
  const cls = "w-5 h-5";
  switch (status) {
    case "delivered": return <CheckCircle2 className={`${cls} text-emerald-500`} />;
    case "shipped":
    case "out_for_delivery": return <Truck className={`${cls} text-sky-500`} />;
    case "cancelled": return <XCircle className={`${cls} text-red-400`} />;
    case "returned":
    case "refunded": return <RotateCcw className={`${cls} text-rose-400`} />;
    default: return <Clock className={`${cls} text-stone-400`} />;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number | string | null | undefined): string {
  const n = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-stone-200 rounded-sm p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-36 bg-stone-200 rounded" />
          <div className="h-3 w-24 bg-stone-100 rounded" />
        </div>
        <div className="h-6 w-24 bg-stone-200 rounded-full" />
      </div>
      <div className="flex gap-3 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-12 h-14 bg-stone-200 rounded flex-shrink-0" />
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-stone-100">
        <div className="h-4 w-20 bg-stone-200 rounded" />
        <div className="h-4 w-16 bg-stone-100 rounded" />
      </div>
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const images = (order.items ?? [])
    .map((i) => i.productSnapshot?.primaryImageUrl)
    .filter(Boolean) as string[];

  return (
    <button
      id={`order-card-${order.id}`}
      onClick={onClick}
      className="block w-full text-left bg-white border border-stone-200 rounded-sm p-5 hover:border-stone-400 hover:shadow-md transition-all duration-200 group"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div className="flex flex-col gap-1">
          <p className="font-bold text-stone-900 tracking-wide text-sm font-mono">
            {order.orderNumber}
          </p>
          <p className="text-xs text-stone-400">{fmtDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <ChevronRight
            size={16}
            className="text-stone-300 group-hover:text-stone-600 group-hover:translate-x-0.5 transition-transform"
          />
        </div>
      </div>

      {/* Item thumbnails */}
      {images.length > 0 && (
        <div className="flex gap-2 mb-4">
          {images.slice(0, 4).map((url, idx) => (
            <div
              key={idx}
              className="w-12 h-14 bg-stone-100 flex-shrink-0 overflow-hidden rounded-sm border border-stone-100"
            >
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          ))}
          {images.length > 4 && (
            <div className="w-12 h-14 bg-stone-100 flex-shrink-0 rounded-sm border border-stone-100 flex items-center justify-center text-xs text-stone-500 font-bold">
              +{images.length - 4}
            </div>
          )}
        </div>
      )}

      {/* Item names */}
      <div className="mb-4">
        <p className="text-xs text-stone-500 leading-relaxed truncate">
          {(order.items ?? [])
            .map((i) => i.productSnapshot?.productName ?? "Unknown item")
            .filter(Boolean)
            .join(" · ") || "—"}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-stone-100">
        <span className="text-xs text-stone-400">
          {(order.items ?? []).reduce((s, i) => s + i.quantity, 0)} item(s)
        </span>
        <span className="font-bold text-stone-900 text-sm">{fmt(order.totalAmount)}</span>
      </div>
    </button>
  );
}

// ─── Price Breakdown ──────────────────────────────────────────────────────────

// function PriceBreakdown({ order }: { order: Order }) {
//   return (
//     <div className="bg-stone-50 border border-stone-100 rounded-sm p-4 flex flex-col gap-2 text-sm">
//       <div className="flex justify-between text-stone-600">
//         <span>Subtotal</span><span>{fmt(order.subtotal)}</span>
//       </div>
//       {Number(order.shippingCharge) > 0 && (
//         <div className="flex justify-between text-stone-600">
//           <span>Shipping</span><span>{fmt(order.shippingCharge)}</span>
//         </div>
//       )}
//       {Number(order.shippingCharge) === 0 && (
//         <div className="flex justify-between text-emerald-600">
//           <span>Shipping</span><span className="font-medium">Free</span>
//         </div>
//       )}
//       {Number(order.taxAmount) > 0 && (
//         <div className="flex justify-between text-stone-600">
//           <span>Processing Fee (2%)</span><span>{fmt(order.taxAmount)}</span>
//         </div>
//       )}
//       {Number(order.discountAmount) > 0 && (
//         <div className="flex justify-between text-emerald-600">
//           <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
//           <span>−{fmt(order.discountAmount)}</span>
//         </div>
//       )}
//       <div className="flex justify-between font-bold text-stone-900 pt-2 border-t border-stone-200 text-base">
//         <span>Total <span className="text-xs font-normal text-stone-400">(incl. GST)</span></span>
//         <span>{fmt(order.totalAmount)}</span>
//       </div>
//     </div>
//   );
// }

// ─── Status Timeline ──────────────────────────────────────────────────────────

function Timeline({ history }: { history: Order["statusHistory"] }) {
  if (!history?.length) return null;
  const sorted = [...history].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  return (
    <div className="flex flex-col gap-0">
      {sorted.map((h, idx) => {
        const isLast = idx === sorted.length - 1;
        return (
          <div key={h.id ?? idx} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex-shrink-0 mt-0.5">
                <TimelineIcon status={h.toStatus} />
              </div>
              {!isLast && <div className="w-px flex-1 bg-stone-200 my-1 min-h-[1.5rem]" />}
            </div>
            <div className="pb-4">
              <p className="text-sm font-semibold text-stone-800 capitalize">
                {h.toStatus.replace(/_/g, " ")}
              </p>
              {h.note && (
                <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{h.note}</p>
              )}
              <p className="text-[11px] text-stone-400 mt-0.5">{fmtDateTime(h.createdAt)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────

function CancelModal({
  orderId,
  onClose,
  onCancelled,
}: {
  orderId: string;
  onClose: () => void;
  onCancelled: (order: Order) => void;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!reason.trim()) { setError("Please provide a reason for cancellation."); return; }
    setError(null);
    setLoading(true);
    try {
      const updated = await cancelOrder(orderId, reason.trim());
      onCancelled(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to cancel. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-sm border border-stone-200 shadow-2xl w-full max-w-md p-6 z-10">
        <button
          id="cancel-modal-close"
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 transition-colors"
        >
          <X size={18} />
        </button>
        <h3 className="font-bold uppercase tracking-wider text-xs text-stone-500 mb-1">Cancel Order</h3>
        <p className="text-stone-800 font-semibold mb-4">
          Are you sure you want to cancel this order?
        </p>
        <label className="text-xs uppercase tracking-wider text-stone-500 font-semibold block mb-1">
          Reason <span className="text-red-400">*</span>
        </label>
        <textarea
          id="cancel-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Please tell us why you want to cancel…"
          className="w-full border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-black transition-colors resize-none rounded-sm bg-stone-50"
        />
        {error && (
          <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
            <AlertCircle size={12} />{error}
          </p>
        )}
        <div className="flex gap-3 mt-5">
          <button
            id="cancel-modal-dismiss"
            onClick={onClose}
            className="flex-1 border border-stone-300 text-stone-700 py-2.5 text-sm font-semibold hover:bg-stone-50 transition-colors rounded-sm"
          >
            Keep Order
          </button>
          <button
            id="cancel-modal-confirm"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 bg-red-600 text-white py-2.5 text-sm font-bold uppercase tracking-wider hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 rounded-sm"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? "Cancelling…" : "Yes, Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order Detail Drawer ──────────────────────────────────────────────────────

function OrderDetailDrawer({
  orderId,
  onClose,
  onOrderUpdated,
}: {
  orderId: string;
  onClose: () => void;
  onOrderUpdated: (order: Order) => void;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    getMyOrder(orderId)
      .then(setOrder)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load order."))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleCancelled = (updated: Order) => {
    setOrder(updated);
    setShowCancelModal(false);
    onOrderUpdated(updated);
  };

  const canCancel = order ? CANCELLABLE_STATUSES.has(order.status) : false;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer — explicit inline height/overflow so global CSS can't interfere */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          zIndex: 50,
          width: "100%",
          maxWidth: 520,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "#fcf9f0",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        }}
      >
        {/* ── Header (fixed, never scrolls) ── */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid #e7e5e4",
            background: "#fff",
          }}
        >
          <div>
            <p style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, color: "#1c1917", lineHeight: 1.4 }}>
              {order?.orderNumber ?? "Order Details"}
            </p>
            {order && (
              <p style={{ fontSize: 12, color: "#a8a29e", marginTop: 2, lineHeight: 1.4 }}>
                {fmtDate(order.createdAt)}
              </p>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {order && <StatusBadge status={order.status} />}
            <button
              id="order-detail-close"
              onClick={onClose}
              style={{ color: "#a8a29e", padding: 4, lineHeight: 0, cursor: "pointer", background: "none", border: "none" }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Body (scrollable) ── */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 28,
          }}
        >
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px 0", color: "#a8a29e" }}>
              <Loader2 size={28} className="animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 2, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 8, color: "#b91c1c", fontSize: 14, lineHeight: 1.5 }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{error}</span>
            </div>
          )}

          {order && !loading && (
            <>
              {/* ── Items ── */}
              <div>
                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#78716c", fontWeight: 600, marginBottom: 12, lineHeight: 1.5 }}>
                  Items ({(order.items ?? []).reduce((s, i) => s + i.quantity, 0)})
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(order.items ?? []).length === 0 && (
                    <p style={{ fontSize: 14, color: "#a8a29e", fontStyle: "italic", lineHeight: 1.5 }}>No items found.</p>
                  )}
                  {(order.items ?? []).map((item) => {
                    const snap = item.productSnapshot ?? {} as ProductSnapshot;
                    return (
                      <div key={item.id} style={{ display: "flex", gap: 12, background: "#fff", border: "1px solid #f5f5f4", borderRadius: 2, padding: 12 }}>
                        {/* Thumbnail */}
                        <div style={{ width: 52, height: 62, flexShrink: 0, background: "#f5f5f4", borderRadius: 2, overflow: "hidden" }}>
                          {snap?.primaryImageUrl ? (
                            <img
                              src={snap?.primaryImageUrl}
                              alt={snap?.productName ?? ""}
                              style={{ width: 52, height: 62, objectFit: "cover", display: "block" }}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Package size={20} style={{ color: "#d6d3d1" }} />
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#1c1917", lineHeight: 1.4, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {snap?.productName ?? "Unknown Product"}
                          </p>
                          {snap?.brandName && (
                            <p style={{ fontSize: 12, color: "#a8a29e", lineHeight: 1.4 }}>{snap?.brandName}</p>
                          )}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                            {snap?.size && (
                              <span style={{ fontSize: 10, background: "#f5f5f4", color: "#57534e", padding: "2px 6px", borderRadius: 2, fontFamily: "monospace" }}>
                                {snap?.size}
                              </span>
                            )}
                            {snap?.color && (
                              <span style={{ fontSize: 10, background: "#f5f5f4", color: "#57534e", padding: "2px 6px", borderRadius: 2, display: "flex", alignItems: "center", gap: 4 }}>
                                {snap?.colorHex && (
                                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: snap?.colorHex, border: "1px solid #e7e5e4", display: "inline-block" }} />
                                )}
                                {snap?.color}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 12, color: "#78716c", marginTop: 6, lineHeight: 1.4 }}>
                            Qty: {item.quantity} × {fmt(item.unitPrice)}
                          </p>
                        </div>
                        {/* Line total */}
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#1c1917", flexShrink: 0, lineHeight: 1.4 }}>
                          {fmt(item.totalPrice)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Price Breakdown ── */}
              <div>
                <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#78716c", fontWeight: 600, marginBottom: 12, lineHeight: 1.5 }}>
                  Price Breakdown
                </p>
                <div style={{ background: "#fafaf9", border: "1px solid #f5f5f4", borderRadius: 2, padding: 16, display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#57534e" }}>
                    <span>Subtotal</span><span>{fmt(order.subtotal)}</span>
                  </div>
                  {Number(order.shippingCharge) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#57534e" }}>
                      <span>Shipping</span><span>{fmt(order.shippingCharge)}</span>
                    </div>
                  )}
                  {Number(order.shippingCharge) === 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#059669" }}>
                      <span>Shipping</span><span style={{ fontWeight: 500 }}>Free</span>
                    </div>
                  )}
                  {Number(order.taxAmount) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#57534e" }}>
                      <span>Processing Fee (2%)</span><span>{fmt(order.taxAmount)}</span>
                    </div>
                  )}
                  {Number(order.discountAmount) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#059669" }}>
                      <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                      <span>−{fmt(order.discountAmount)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#1c1917", paddingTop: 10, marginTop: 4, borderTop: "1px solid #e7e5e4", fontSize: 15 }}>
                    <span>Total <span style={{ fontSize: 11, fontWeight: 400, color: "#a8a29e" }}>(incl. GST)</span></span>
                    <span>{fmt(order.totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* ── Tracking ── */}
              {(order.trackingNumber || order.trackingUrl || order.estimatedDelivery) && (
                <div>
                  <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#78716c", fontWeight: 600, marginBottom: 12, lineHeight: 1.5 }}>
                    Tracking
                  </p>
                  <div style={{ background: "#fff", border: "1px solid #f5f5f4", borderRadius: 2, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    {order.trackingNumber && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                        <Truck size={14} style={{ color: "#a8a29e", flexShrink: 0 }} />
                        <span style={{ color: "#78716c", flexShrink: 0 }}>Tracking No:</span>
                        <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#1c1917" }}>{order.trackingNumber}</span>
                      </div>
                    )}
                    {order.estimatedDelivery && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                        <Clock size={14} style={{ color: "#a8a29e", flexShrink: 0 }} />
                        <span style={{ color: "#78716c" }}>Est. Delivery:</span>
                        <span style={{ fontWeight: 600, color: "#1c1917" }}>{fmtDate(order.estimatedDelivery)}</span>
                      </div>
                    )}
                    {order.trackingUrl && (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        id="tracking-link"
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#2563eb", fontWeight: 500, lineHeight: 1.5 }}
                      >
                        Track your shipment <ExternalLink size={12} />
                      </a>
                    )}
                    {order.deliveredAt && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#047857" }}>
                        <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                        <span>Delivered on {fmtDate(order.deliveredAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Shipping Address ── */}
              {order.shippingAddress && (
                <div>
                  <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#78716c", fontWeight: 600, marginBottom: 12, lineHeight: 1.5 }}>
                    Shipping Address
                  </p>
                  <div style={{ background: "#fff", border: "1px solid #f5f5f4", borderRadius: 2, padding: 16, display: "flex", gap: 14 }}>
                    <MapPin size={16} style={{ color: "#a8a29e", flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: 14, color: "#44403c", lineHeight: 1.7 }}>
                      <p style={{ fontWeight: 600, color: "#1c1917" }}>{order.shippingAddress.fullName}</p>
                      <p style={{ color: "#a8a29e", fontSize: 12 }}>{order.shippingAddress.phone}</p>
                      <p style={{ marginTop: 4 }}>
                        {order.shippingAddress.addressLine1}
                        {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ""}
                      </p>
                      {order.shippingAddress.landmark && (
                        <p style={{ color: "#a8a29e", fontSize: 12 }}>Near: {order.shippingAddress.landmark}</p>
                      )}
                      <p>{order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}</p>
                      <p style={{ color: "#a8a29e", fontSize: 12 }}>{order.shippingAddress.country}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Status Timeline ── */}
              {(order.statusHistory ?? []).length > 0 && (
                <div>
                  <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#78716c", fontWeight: 600, marginBottom: 12, lineHeight: 1.5 }}>
                    Order Timeline
                  </p>
                  <div style={{ background: "#fff", border: "1px solid #f5f5f4", borderRadius: 2, padding: 16 }}>
                    <Timeline history={order.statusHistory} />
                  </div>
                </div>
              )}

              {/* ── Payment ── */}
              {order.payment && (
                <div>
                  <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#78716c", fontWeight: 600, marginBottom: 12, lineHeight: 1.5 }}>
                    Payment
                  </p>
                  <div style={{ background: "#fff", border: "1px solid #f5f5f4", borderRadius: 2, padding: 16, display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
                    {order.payment.method && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#57534e" }}>
                        <span>Method</span>
                        <span style={{ fontWeight: 600, color: "#1c1917", textTransform: "capitalize" }}>{order.payment.method}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#57534e" }}>
                      <span>Payment Status</span>
                      <StatusBadge status={order.paymentStatus} />
                    </div>
                    {order.payment.razorpayPaymentId && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#a8a29e", fontSize: 12 }}>
                        <span>Payment ID</span>
                        <span style={{ fontFamily: "monospace" }}>{order.payment.razorpayPaymentId}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Drawer footer */}
        {order && !loading && canCancel && (
          <div className="px-6 py-4 border-t border-stone-200 bg-white flex-shrink-0">
            <button
              id="cancel-order-btn"
              onClick={() => setShowCancelModal(true)}
              className="w-full border border-red-300 text-red-600 py-3 text-sm font-bold uppercase tracking-wider hover:bg-red-50 hover:border-red-500 transition-colors rounded-sm flex items-center justify-center gap-2"
            >
              <XCircle size={16} />
              Cancel Order
            </button>
          </div>
        )}
      </div>

      {showCancelModal && order && (
        <CancelModal
          orderId={order.id}
          onClose={() => setShowCancelModal(false)}
          onCancelled={handleCancelled}
        />
      )}
    </>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
      <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center">
        <ShoppingBag size={36} className="text-stone-300" />
      </div>
      <div>
        <p className="text-lg font-bold text-stone-800 mb-1">
          {filtered ? "No orders found" : "No orders yet"}
        </p>
        <p className="text-sm text-stone-400 max-w-xs">
          {filtered
            ? "Try a different status filter or sort."
            : "Once you place an order it'll appear here."}
        </p>
      </div>
      {!filtered && (
        <Link
          to="/"
          className="mt-2 bg-black text-white text-sm font-bold uppercase tracking-wider px-6 py-3 hover:bg-stone-800 transition-colors rounded-sm"
        >
          Start Shopping
        </Link>
      )}
    </div>
  );
}

// ─── Auth Guard ───────────────────────────────────────────────────────────────

function AuthGuard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
        <Package size={28} className="text-stone-300" />
      </div>
      <div>
        <p className="text-xl font-bold text-stone-900 mb-2">Sign in to view your orders</p>
        <p className="text-sm text-stone-400">Your order history is saved to your account.</p>
      </div>
      <Link
        to="/checkout"
        className="bg-red-600 text-white text-sm font-bold uppercase tracking-wider px-6 py-3 hover:bg-red-400 transition-colors rounded-sm"
      >
        Go to Checkout
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const isLoggedIn = !!localStorage.getItem("unchanged_token");

  const [data, setData] = useState<PaginatedOrders | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(
    async (pg: number, status: string, sort: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await getMyOrders({
          page: pg,
          limit: 10,
          status: status || undefined,
          sortBy: sort,
        });
        setData(result);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load orders.";
        if (msg.includes("session has expired") || msg.includes("401")) {
          setSessionExpired(true);
        } else {
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!isLoggedIn) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders(page, statusFilter, sortBy);
  }, [isLoggedIn, page, statusFilter, sortBy, fetchOrders]);

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleSortChange = (val: string) => {
    setSortBy(val);
    setPage(1);
  };

  // When an order is updated (e.g. cancelled), patch it in place
  const handleOrderUpdated = (updated: Order) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        data: prev.data.map((o) => (o.id === updated.id ? { ...o, status: updated.status } : o)),
      };
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#fcf9f0] pt-28 pb-20 px-4 md:px-10 font-sans text-stone-900">
      <div className="max-w-4xl mx-auto">

        {/* Page heading */}
        <div className="mb-8">
          <h1
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              lineHeight: 0.9,
              textTransform: "uppercase",
            }}
          >
            My Orders
          </h1>
          {data && (
            <p className="text-stone-400 text-sm mt-2">
              {data.meta.total} order{data.meta.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Session expired banner */}
        {sessionExpired && (
          <div className="bg-amber-50 border border-amber-200 rounded-sm px-5 py-4 flex items-start gap-3 mb-6">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Your session has expired.</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Please{" "}
                <Link to="/checkout" className="underline font-semibold">
                  log in again
                </Link>{" "}
                to view your orders.
              </p>
            </div>
          </div>
        )}

        {/* Auth guard */}
        {!isLoggedIn && !sessionExpired && <AuthGuard />}

        {isLoggedIn && !sessionExpired && (
          <>
            {/* ── Filters + Sort ── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
              {/* Status tabs (scrollable on mobile) */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1 no-scrollbar">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    id={`filter-${f.value || "all"}`}
                    onClick={() => handleStatusChange(f.value)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${statusFilter === f.value
                      ? "bg-stone-900 text-white"
                      : "bg-white border border-stone-200 text-stone-600 hover:border-stone-400"
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="flex-shrink-0">
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="border border-stone-200 bg-white text-stone-700 text-xs font-semibold uppercase tracking-wider px-3 py-2 rounded-sm focus:outline-none focus:border-stone-400 cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Error ── */}
            {error && !loading && (
              <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 flex items-start gap-2 mb-6">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <button
                  id="retry-btn"
                  onClick={() => fetchOrders(page, statusFilter, sortBy)}
                  className="flex-shrink-0 text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1"
                >
                  <RefreshCcw size={12} />Retry
                </button>
              </div>
            )}

            {/* ── Loading skeletons ── */}
            {loading && (
              <div className="flex flex-col gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {/* ── Orders List ── */}
            {!loading && !error && data && (
              <>
                {data.data.length === 0 ? (
                  <EmptyState filtered={!!statusFilter} />
                ) : (
                  <div className="flex flex-col gap-6">
                    {data.data.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onClick={() => setSelectedOrderId(order.id)}
                      />
                    ))}
                  </div>
                )}

                {/* ── Pagination ── */}
                {data.meta.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-stone-200">
                    <button
                      id="prev-page-btn"
                      onClick={() => setPage((p) => p - 1)}
                      disabled={!data.meta.hasPreviousPage}
                      className="flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-stone-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </button>

                    <p className="text-sm text-stone-500">
                      Page <span className="font-bold text-stone-800">{data.meta.page}</span>{" "}
                      of <span className="font-bold text-stone-800">{data.meta.totalPages}</span>
                    </p>

                    <button
                      id="next-page-btn"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!data.meta.hasNextPage}
                      className="flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-stone-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Order Detail Drawer ── */}
      {selectedOrderId && (
        <OrderDetailDrawer
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onOrderUpdated={handleOrderUpdated}
        />
      )}
    </div>
  );
}
