import { useEffect, useRef, useCallback } from "react";
import { X, Ruler } from "lucide-react";
import sizeGuideImg from "../../assets/size-guide.webp";
import gsap from "gsap";

interface SizeGuideModalProps {
  onClose: () => void;
}

export default function SizeGuideModal({ onClose }: SizeGuideModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Animate in
  useEffect(() => {
    document.body.style.overflow = "hidden";
    gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    gsap.fromTo(
      panelRef.current,
      { y: 50, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 0.38, ease: "power3.out" }
    );
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const close = useCallback(() => {
    gsap.to(backdropRef.current, { opacity: 0, duration: 0.2 });
    gsap.to(panelRef.current, {
      y: 30,
      opacity: 0,
      scale: 0.97,
      duration: 0.22,
      ease: "power2.in",
      onComplete: onClose,
    });
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [close]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-8"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === backdropRef.current) close();
      }}
    >
      <div
        ref={panelRef}
        className="relative bg-[#fcf9f0] w-full max-w-2xl overflow-hidden"
        style={{
          borderRadius: "2px",
          border: "2px solid #141414",
          maxHeight: "92vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-stone-200"
          style={{ background: "#141414" }}
        >
          <div className="flex items-center gap-2">
            <Ruler size={18} color="#fcf9f0" />
            <span
              className="text-sm font-bold uppercase tracking-[0.18em]"
              style={{ color: "#fcf9f0", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1rem" }}
            >
              Size Guide
            </span>
          </div>
          <button
            onClick={close}
            id="size-guide-close-btn"
            aria-label="Close size guide"
            className="w-8 h-8 flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ color: "#fcf9f0", borderRadius: "2px" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Subtitle */}
        <div className="px-6 pt-4 pb-2">
          <p className="text-[11px] uppercase tracking-widest text-stone-500 font-semibold">
            Oversized T-Shirt · Measurements in Inches
          </p>
        </div>

        {/* Image */}
        <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: "calc(92vh - 130px)" }} data-lenis-prevent="true">
          <div
            className="overflow-hidden border border-stone-200"
            style={{ background: "#f9f7f0" }}
          >
            <img
              src={sizeGuideImg}
              alt="Size Chart — Oversized T-Shirt measurements in inches: XS (38 chest), S (40), M (42), L (44), XL (46), XXL (48)"
              style={{
                width: "100%",
                height: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>

          {/* Tip */}
          <p className="mt-4 text-[11px] text-stone-500 leading-relaxed">
            <span className="font-semibold text-stone-700">Tip:</span> If you're between sizes, we recommend sizing up for a more relaxed, oversized fit — it's the look we designed for.
          </p>
        </div>
      </div>
    </div>
  );
}
