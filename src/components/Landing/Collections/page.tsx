import { useRef, useState, useEffect, useCallback } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ShoppingCart,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Zap,
  AlertCircle,
  Star,
} from "lucide-react";
import { addToCart } from "../../../utils/cart";
import { useSearchParams, useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductSize = "XS" | "S" | "M" | "L" | "XL" | "XXL";

type Variant = {
  id: string | number;
  size: ProductSize | null;
  color: string | null;
  colorHex: string | null;
  priceOverride: number | null;
  isActive: boolean;
  inventory?: { quantity: number; reservedQuantity: number };
};

type Product = {
  id: number | string;
  productId?: string; // the parent product UUID
  title: string;
  price: string;
  basePrice?: number;
  sellingPrice?: number;
  discountPercent?: number;
  description?: string | null;
  shortDescription?: string | null;
  imageFront: string | null;
  imageBack: string | null;
  isLimited: boolean;
  variants?: Variant[];
  averageRating?: number;
  reviewCount?: number;
};

// ─── Sizes in display order ───────────────────────────────────────────────────
const ALL_SIZES: ProductSize[] = ["XS", "S", "M", "L", "XL", "XXL"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAvailableQty(variant: Variant): number {
  if (!variant.inventory) return 0;
  return Math.max(
    0,
    variant.inventory.quantity - (variant.inventory.reservedQuantity ?? 0)
  );
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onClick,
}: {
  product: Product;
  onClick: (p: Product) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frontImgRef = useRef<HTMLImageElement>(null);
  const backImgRef = useRef<HTMLImageElement>(null);
  const [added, setAdded] = useState(false);
  const { contextSafe } = useGSAP({ scope: containerRef });

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    // If product has variants/sizes, open modal for size selection
    const hasSize = product.variants && product.variants.some(v => v.size && v.isActive);
    if (hasSize) {
      onClick(product);
      return;
    }
    addToCart({
      id: product.id as number,
      title: product.title,
      price: product.price,
      imageFront: product.imageFront,
      imageBack: product.imageBack,
      isLimited: product.isLimited,
    }, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleMouseEnter = contextSafe(() => {
    gsap.to(frontImgRef.current, { opacity: 0, scale: 1.08, duration: 0.45, ease: "power2.out" });
    gsap.to(backImgRef.current, { opacity: 1, scale: 1, duration: 0.45, ease: "power2.out" });
  });

  const handleMouseLeave = contextSafe(() => {
    gsap.to(frontImgRef.current, { opacity: 1, scale: 1, duration: 0.45, ease: "power2.out" });
    gsap.to(backImgRef.current, { opacity: 0, scale: 1.08, duration: 0.45, ease: "power2.out" });
  });

  const hasDiscount =
    product.discountPercent != null && product.discountPercent > 0;

  return (
    <div
      className="flex flex-col gap-3 group cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onClick(product)}
    >
      {/* Image Box */}
      <div
        ref={containerRef}
        className="aspect-[3/4] bg-stone-200 overflow-hidden relative"
      >
        {/* Badges */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {product.isLimited && (
            <span className="bg-[#701c1c] text-white text-[10px] tracking-wider font-bold px-2 py-1">
              LIMITED
            </span>
          )}
          {hasDiscount && (
            <span className="bg-[#ef4444] text-white text-[10px] tracking-wider font-bold px-2 py-1">
              {Math.round(product.discountPercent!)}% OFF
            </span>
          )}
        </div>

        {/* Quick add button on hover */}
        <button
          onClick={handleQuickAdd}
          className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 ${added
              ? "bg-green-600 text-white"
              : "bg-[#141414] text-white hover:bg-[#ef4444]"
            }`}
        >
          {added ? (
            <>
              <Check size={12} /> Added
            </>
          ) : (
            <>
              <ShoppingCart size={12} /> Quick Add
            </>
          )}
        </button>

        {product.imageFront ? (
          <>
            <img
              ref={frontImgRef}
              src={product.imageFront}
              alt={product.title}
              className="absolute inset-0 w-full h-full object-cover z-0"
            />
            <img
              ref={backImgRef}
              src={product.imageBack || product.imageFront}
              alt={`${product.title} Back`}
              className="absolute inset-0 w-full h-full object-cover z-0 opacity-0 scale-110"
            />
          </>
        ) : (
          <div className="w-full h-full bg-stone-300 flex items-center justify-center">
            <span className="text-stone-500 text-sm">No Image</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div>
        <div className="flex justify-between items-start gap-2 sm:gap-3">
          <h4 className="font-serif font-medium text-xs sm:text-base leading-snug flex-1">
            {product.title}
          </h4>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            {hasDiscount && product.basePrice ? (
              <>
                <span className="text-[10px] sm:text-xs text-stone-400 line-through">
                  {formatINR(product.basePrice)}
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#ef4444]">
                  {product.price}
                </span>
              </>
            ) : (
              <span className="text-xs sm:text-sm font-bold">{product.price}</span>
            )}
          </div>
        </div>
        {product.averageRating != null && product.averageRating > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Star size={10} className="fill-amber-400 text-amber-400" />
            <span className="text-[10px] text-stone-500">
              {Number(product.averageRating).toFixed(1)}{" "}
              {product.reviewCount ? `(${product.reviewCount})` : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Product Quick View Modal ────────────────────────────────────────────────

function ProductModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  const images = [product.imageFront, product.imageBack || product.imageFront].filter(Boolean);

  // Build a size → variant map
  const sizeMap = new Map<ProductSize, Variant>();
  if (product.variants) {
    for (const v of product.variants) {
      if (v.size && v.isActive) {
        sizeMap.set(v.size as ProductSize, v);
      }
    }
  }

  const hasVariants = sizeMap.size > 0;

  // If no variants at all, treat as one-size
  const noSizeProduct = !hasVariants;

  // Selected variant
  const selectedVariant = selectedSize ? sizeMap.get(selectedSize) : null;
  const availableQty = selectedVariant
    ? getAvailableQty(selectedVariant)
    : noSizeProduct
      ? 99
      : 0;

  const isOutOfStock = hasVariants && selectedSize && availableQty === 0;
  const maxQty = Math.min(availableQty, 10);

  const hasDiscount =
    product.discountPercent != null && Number(product.discountPercent) > 0;

  // Animate in
  useEffect(() => {
    document.body.style.overflow = "hidden";
    gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    gsap.fromTo(
      panelRef.current,
      { y: 60, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.38, ease: "power3.out" }
    );
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const closeModal = useCallback(() => {
    gsap.to(backdropRef.current, { opacity: 0, duration: 0.2 });
    gsap.to(panelRef.current, {
      y: 40,
      opacity: 0,
      duration: 0.25,
      ease: "power2.in",
      onComplete: onClose,
    });
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeModal]);

  const validateAndGetCartItem = () => {
    if (hasVariants && !selectedSize) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 2500);
      return null;
    }
    if (hasVariants && selectedSize && isOutOfStock) {
      return null;
    }

    const variantId = selectedVariant
      ? selectedVariant.id
      : (product.id as number);

    return {
      id: variantId as number,
      title: product.title,
      price: product.price,
      imageFront: product.imageFront,
      imageBack: product.imageBack,
      isLimited: product.isLimited,
      size: selectedSize ?? undefined,
      maxStock: selectedVariant ? getAvailableQty(selectedVariant) : 10,
    };
  };

  const handleAddToCart = () => {
    const item = validateAndGetCartItem();
    if (!item) return;
    addToCart(item, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  const handleBuyNow = () => {
    const item = validateAndGetCartItem();
    if (!item) return;
    addToCart(item, quantity);
    closeModal();
    navigate("/checkout");
  };

  const sizeGuide = (size: ProductSize) => {
    const variant = sizeMap.get(size);
    if (!variant) return "unavailable"; // size not in API
    const qty = getAvailableQty(variant);
    if (qty === 0) return "sold-out";
    if (qty <= 3) return "low";
    return "available";
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[500] flex items-end md:items-center justify-center p-0 md:p-6"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === backdropRef.current) closeModal();
      }}
    >
      <div
        ref={panelRef}
        className="relative w-full md:max-w-4xl bg-[#fcf9f0] overflow-hidden"
        style={{
          maxHeight: "95vh",
          borderRadius: "2px 2px 0 0",
          borderTop: "3px solid #141414",
        }}
      >
        {/* Close button */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center bg-[#141414] text-white hover:bg-[#ef4444] transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col md:flex-row overflow-y-auto md:overflow-hidden" style={{ maxHeight: "95vh" }}>
          {/* ── Left: Image Gallery ──────────────────────────────────────────── */}
          <div className="w-full md:w-[45%] flex-shrink-0 bg-stone-200 relative aspect-[4/5] md:aspect-auto md:min-h-[560px]">
            {images.length > 0 && (
              <img
                key={imgIndex}
                src={images[imgIndex]}
                alt={product.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* Image nav arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white flex items-center justify-center transition-colors z-10"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white flex items-center justify-center transition-colors z-10"
                >
                  <ChevronRight size={18} />
                </button>
                {/* Dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIndex(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIndex ? "bg-[#141414]" : "bg-white/60"
                        }`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Badges */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
              {product.isLimited && (
                <span className="bg-[#701c1c] text-white text-[10px] tracking-wider font-bold px-2 py-1">
                  LIMITED EDITION
                </span>
              )}
              {hasDiscount && (
                <span className="bg-[#ef4444] text-white text-[11px] tracking-wider font-bold px-2 py-1">
                  {Math.round(Number(product.discountPercent))}% OFF
                </span>
              )}
            </div>
          </div>

          {/* ── Right: Product Details ───────────────────────────────────────── */}
          <div className="flex-1 flex flex-col gap-0 md:overflow-y-auto">
            <div className="p-6 md:p-8 flex flex-col gap-5">
              {/* Title & Rating */}
              <div>
                <h2
                  className="font-serif text-2xl md:text-3xl font-bold leading-tight"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", textTransform: "uppercase", letterSpacing: "0.02em" }}
                >
                  {product.title}
                </h2>
                {product.averageRating != null && Number(product.averageRating) > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={12}
                        className={
                          star <= Math.round(Number(product.averageRating))
                            ? "fill-amber-400 text-amber-400"
                            : "text-stone-300"
                        }
                      />
                    ))}
                    <span className="text-xs text-stone-500 ml-1">
                      {Number(product.averageRating).toFixed(1)}
                      {product.reviewCount
                        ? ` · ${product.reviewCount} review${product.reviewCount !== 1 ? "s" : ""}`
                        : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Price Block */}
              <div className="flex items-baseline gap-3">
                {hasDiscount && product.basePrice ? (
                  <>
                    <span className="text-2xl font-bold text-[#141414]">
                      {product.price}
                    </span>
                    <span className="text-base text-stone-400 line-through">
                      {formatINR(product.basePrice)}
                    </span>
                    <span className="text-sm font-bold text-[#ef4444] bg-red-50 px-2 py-0.5">
                      Save {Math.round(Number(product.discountPercent))}%
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-[#141414]">
                    {product.price}
                  </span>
                )}
              </div>

              {/* Tax note */}
              <p className="text-[11px] text-stone-400 -mt-3">
                Inclusive of all taxes · Free shipping above ₹999
              </p>

              {/* Description */}
              {(product.description || product.shortDescription) && (
                <div className="border-t border-stone-200 pt-4">
                  <p className="text-sm text-stone-600 leading-relaxed">
                    {product.shortDescription || product.description}
                  </p>
                </div>
              )}

              {/* ── Size Selector ───────────────────────────────────────── */}
              {hasVariants && (
                <div className="border-t border-stone-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                      Select Size
                    </span>
                    {selectedSize && (
                      <span className="text-xs text-stone-500">
                        {selectedSize}
                        {availableQty > 0 && availableQty <= 3 && (
                          <span className="text-[#ef4444] ml-1 font-semibold">
                            — Only {availableQty} left!
                          </span>
                        )}
                        {availableQty === 0 && (
                          <span className="text-stone-400 ml-1">
                            — Out of stock
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  {sizeError && (
                    <div className="flex items-center gap-2 text-[#ef4444] text-xs mb-3 animate-pulse">
                      <AlertCircle size={14} />
                      Please select a size to continue
                    </div>
                  )}

                  <div className="grid grid-cols-6 gap-2">
                    {ALL_SIZES.map((size) => {
                      const status = sizeMap.size > 0 ? sizeGuide(size) : "unavailable";
                      const isSelected = selectedSize === size;
                      const isSoldOut = status === "sold-out";
                      const isUnavailable = status === "unavailable";
                      const isLow = status === "low";
                      const disabled = isSoldOut || isUnavailable;

                      return (
                        <button
                          key={size}
                          disabled={disabled}
                          onClick={() => {
                            if (!disabled) {
                              setSelectedSize(size);
                              setSizeError(false);
                              setQuantity(1);
                            }
                          }}
                          title={
                            isSoldOut
                              ? "Sold Out"
                              : isUnavailable
                                ? "Not available"
                                : isLow
                                  ? `Only ${getAvailableQty(sizeMap.get(size)!)} left`
                                  : size
                          }
                          className={`relative py-2.5 text-sm font-semibold border transition-all duration-150 select-none
                            ${isSelected
                              ? "border-[#141414] bg-[#141414] text-white"
                              : disabled
                                ? "border-stone-200 text-stone-300 cursor-not-allowed bg-stone-50 line-through"
                                : isLow
                                  ? "border-amber-400 text-amber-700 hover:border-[#141414] hover:bg-[#141414] hover:text-white"
                                  : "border-stone-300 text-stone-700 hover:border-[#141414] hover:bg-[#141414] hover:text-white"
                            }`}
                        >
                          {size}
                          {isLow && !isSelected && (
                            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                          )}
                          {isSoldOut && (
                            <span
                              className="absolute inset-0 flex items-center justify-center pointer-events-none"
                              style={{
                                background:
                                  "repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.05) 4px, rgba(0,0,0,0.05) 5px)",
                              }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Size legend */}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                      <span className="text-[10px] text-stone-400">Low stock</span>
                    </div>
                    <span className="text-[10px] text-stone-400">Strikethrough = Sold Out</span>
                  </div>
                </div>
              )}

              {/* No size info yet (single-size product) */}
              {noSizeProduct && (
                <div className="border-t border-stone-200 pt-4">
                  <p className="text-xs text-stone-500 italic">One size fits all</p>
                </div>
              )}

              {/* ── Quantity Selector ────────────────────────────────────── */}
              <div className="border-t border-stone-200 pt-4">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-3">
                  Quantity
                </span>
                <div className="flex items-center gap-0">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-10 h-10 border border-stone-300 flex items-center justify-center hover:bg-stone-100 disabled:opacity-30 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <div className="w-12 h-10 border-t border-b border-stone-300 flex items-center justify-center text-sm font-bold">
                    {quantity}
                  </div>
                  <button
                    onClick={() =>
                      setQuantity((q) => Math.min(q + 1, maxQty || 10))
                    }
                    disabled={
                      quantity >= (maxQty || 10) ||
                      (hasVariants && !selectedSize)
                    }
                    className="w-10 h-10 border border-stone-300 flex items-center justify-center hover:bg-stone-100 disabled:opacity-30 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                  {hasVariants && selectedSize && isOutOfStock && (
                    <span className="ml-3 text-xs text-stone-400 italic">
                      Out of stock
                    </span>
                  )}
                </div>
              </div>

              {/* ── Action Buttons ───────────────────────────────────────── */}
              <div className="flex flex-col gap-3 border-t border-stone-200 pt-4">
                {/* Add to Cart */}
                <button
                  onClick={handleAddToCart}
                  disabled={
                    (hasVariants && (!selectedSize || !!isOutOfStock))
                  }
                  className={`w-full py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200
                    ${added
                      ? "bg-green-600 text-white"
                      : hasVariants && (!selectedSize || !!isOutOfStock)
                        ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                        : "bg-[#141414] text-white hover:bg-stone-800 active:scale-[0.98]"
                    }`}
                >
                  {added ? (
                    <>
                      <Check size={16} /> Added to Cart!
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={16} /> Add to Cart
                    </>
                  )}
                </button>

                {/* Buy Now */}
                <button
                  onClick={handleBuyNow}
                  disabled={
                    hasVariants && (!selectedSize || !!isOutOfStock)
                  }
                  className={`w-full py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 border-2 border-[#ef4444]
                    ${hasVariants && (!selectedSize || !!isOutOfStock)
                      ? "text-stone-300 border-stone-200 cursor-not-allowed"
                      : "text-[#ef4444] hover:bg-[#ef4444] hover:text-white active:scale-[0.98]"
                    }`}
                >
                  <Zap size={16} />
                  Buy Now
                </button>

                {/* Hint when size not selected */}
                {hasVariants && !selectedSize && (
                  <p className="text-center text-xs text-stone-400">
                    ↑ Select a size to enable purchase
                  </p>
                )}
              </div>

              {/* Delivery note */}
              <p className="text-[11px] text-stone-400 flex items-center gap-1.5 -mt-1">
                <span>📦</span> Usually ships in 2–5 business days
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Collections Section ─────────────────────────────────────────────────

export default function CollectionSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search")?.toLowerCase() || "";

  useEffect(() => {
    fetch(`${import.meta.env.VITE_BACKEND_URL}/products`)
      .then((res) => res.json())
      .then((data) => {
        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.data?.data)
              ? data.data.data
              : [];

        const formattedProducts: Product[] = items.map((item: any) => {
          const allImages: any[] = item.images ?? [];
          const frontImg =
            allImages.find((img: any) => img.isPrimary)?.url ||
            allImages[0]?.url ||
            null;
          const backImg =
            allImages.find((img: any) => !img.isPrimary)?.url || frontImg;

          return {
            id: item.variants?.[0]?.id || item.id,
            productId: item.id,
            title: item.name,
            price: `₹${Math.round(item.sellingPrice)}`,
            basePrice:
              item.basePrice && item.basePrice !== item.sellingPrice
                ? item.basePrice
                : undefined,
            sellingPrice: item.sellingPrice,
            discountPercent: item.discountPercent ?? 0,
            description: item.description,
            shortDescription: item.shortDescription,
            imageFront: frontImg,
            imageBack: backImg,
            isLimited: item.isFeatured,
            variants: item.variants ?? [],
            averageRating: item.averageRating,
            reviewCount: item.reviewCount,
          };
        });

        setProducts(formattedProducts);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching products:", err);
        setProducts([]);
        setLoading(false);
      });
  }, []);

  const displayedProducts = products.filter((product) =>
    product.title.toLowerCase().includes(searchQuery)
  );

  return (
    <div
      id="collections"
      className="min-h-screen flex flex-col bg-[#fcf9f0] font-sans text-stone-900 pt-28 lg:pt-0"
    >
      <main className="flex-1 max-w-screen-2xl mx-auto w-full flex flex-col md:flex-row px-2 sm:px-6 md:px-12 py-6 sm:py-8 gap-6 sm:gap-12 relative">
        {/* Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0 hidden md:block">
          <div className="sticky top-28 flex flex-col gap-10 h-fit">
            {/* Collections Filter */}
            <div className="flex flex-col gap-4">
              <h3 className="font-bold uppercase tracking-wider text-sm">
                Collections
              </h3>
              <div className="border-b-2 border-black" />
              <ul className="space-y-3 text-sm text-stone-600">
                <li className="cursor-pointer text-black font-medium">
                  View All
                </li>
                <li className="cursor-pointer hover:text-black transition-colors">
                  Men's Collection
                </li>
                <li className="cursor-pointer hover:text-black transition-colors">
                  Women's Collection
                </li>
              </ul>
            </div>

            {/* Size Filter */}
            <div className="flex flex-col gap-4">
              <h3 className="font-bold uppercase tracking-wider text-sm">
                Size
              </h3>
              <div className="border-b-2 border-black" />
              <div className="grid grid-cols-3 gap-2">
                {ALL_SIZES.map((size) => (
                  <button
                    key={size}
                    className="border border-stone-300 py-2 text-sm hover:border-black transition-colors bg-white"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="flex flex-col gap-4">
              <h3 className="font-bold uppercase tracking-wider text-sm">
                Sort By
              </h3>
              <div className="border-b-2 border-black" />
              <select className="w-full border border-stone-300 bg-white p-2 text-sm outline-none">
                <option>Recommended</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Newest Arrivals</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-2 gap-y-6 sm:gap-x-6 sm:gap-y-12">
            {loading ? (
              <div className="col-span-full py-20 text-center text-stone-500">
                Loading products…
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="col-span-full py-20 text-center text-stone-500">
                No products found.
              </div>
            ) : (
              displayedProducts.map((product) => (
                <ProductCard
                  key={String(product.id)}
                  product={product}
                  onClick={setSelectedProduct}
                />
              ))
            )}
          </div>
        </div>
      </main>

      {/* Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}