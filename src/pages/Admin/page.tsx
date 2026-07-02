import { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  X,
  Loader2,
  Plus,
  Image as ImageIcon,
  Package,
  Edit3,
  ChevronDown,
  ChevronUp,
  Save,
  Search,
  RefreshCw,
  Tag,
  AlertCircle,
  CheckCircle2,
  Boxes,
  Percent,
  Flame
} from "lucide-react";

const API = import.meta.env.VITE_BACKEND_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Variant {
  id: string;
  sku: string;
  size?: string;
  color?: string;
  priceOverride?: number;
  isActive: boolean;
  inventory?: { quantity: number; reservedQuantity: number };
}

interface Product {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  sellingPrice: number;
  discountPercent: number;
  isActive: boolean;
  isFeatured: boolean;
  isLimitedStock?: boolean;
  description?: string;
  shortDescription?: string;
  variants?: Variant[];
  images?: { id: string; url: string; isPrimary: boolean }[];
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

const uploadImage = async (file: File) => {
  const presignRes = await fetch(`${API}/uploads/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder: "products", contentType: file.type, fileSizeBytes: file.size }),
  });
  if (!presignRes.ok) throw new Error("Failed to get presigned URL");
  const presignData = await presignRes.json();

  const formData = new FormData();
  formData.append("file", file);
  const uploadRes = await fetch(presignData.uploadUrl, { method: "POST", body: formData });
  if (!uploadRes.ok) throw new Error("Failed to upload file");
  const uploadData = await uploadRes.json();

  await fetch(`${API}/uploads/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: uploadData.key }),
  });

  return uploadData.publicUrl;
};

function Toast({
  msg,
  type,
  onClose,
}: {
  msg: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl text-sm font-medium transition-all
        ${type === "success" ? "bg-emerald-900 text-emerald-100 border border-emerald-700" : "bg-red-900 text-red-100 border border-red-700"}`}
    >
      {type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span>{msg}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Tab: Add Product ────────────────────────────────────────────────────────

function AddProductTab({ onToast }: { onToast: (msg: string, type: "success" | "error") => void }) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isLimitedStock, setIsLimitedStock] = useState(false);
  const [stockQuantity, setStockQuantity] = useState("");
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Auto-flag as limited if stock < 10
  const autoIsLimited = stockQuantity !== "" && parseInt(stockQuantity) < 10;

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Fetch categories on mount
  useEffect(() => {
    fetch(`${API}/categories`)
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : data?.data ?? [];
        setCategories(arr);
        if (arr.length > 0) setCategoryId(arr[0].id);
      })
      .catch(() => onToast("Failed to load categories", "error"))
      .finally(() => setCategoriesLoading(false));
  }, [onToast]);

  const discount =
    basePrice && sellingPrice
      ? Math.max(0, Math.round(((parseFloat(basePrice) - parseFloat(sellingPrice)) / parseFloat(basePrice)) * 100))
      : 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isFront: boolean) => {
    if (e.target.files?.[0]) {
      if (isFront) setFrontImage(e.target.files[0]);
      else setBackImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const productRes = await fetch(`${API}/admin/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          basePrice: parseFloat(basePrice),
          sellingPrice: parseFloat(sellingPrice),
          categoryId,
          isActive: true,
          isFeatured,
          isLimitedStock: isLimitedStock || autoIsLimited,
          description: description || undefined,
        }),
      });
      if (!productRes.ok) {
        const err = await productRes.json();
        throw new Error(err.message || "Failed to create product");
      }
      const product = await productRes.json();

      const uploadedImages: { url: string; isPrimary: boolean }[] = [];
      if (frontImage) uploadedImages.push({ url: await uploadImage(frontImage), isPrimary: true });
      if (backImage) uploadedImages.push({ url: await uploadImage(backImage), isPrimary: false });

      if (uploadedImages.length > 0) {
        const linkRes = await fetch(`${API}/admin/products/${product.id}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: uploadedImages }),
        });
        if (!linkRes.ok) throw new Error("Failed to link images");
      }

      onToast("Product created successfully!", "success");
      setName(""); setSellingPrice(""); setBasePrice(""); setDescription("");
      setIsFeatured(false); setIsLimitedStock(false); setStockQuantity("");
      setFrontImage(null); setBackImage(null);
      if (frontInputRef.current) frontInputRef.current.value = "";
      if (backInputRef.current) backInputRef.current.value = "";
    } catch (err: any) {
      onToast(err.message || "Something went wrong.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Don't allow submission without a valid category
  const canSubmit = !loading && !!frontImage && !!categoryId && !categoriesLoading;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* Product Info */}
      <section className="admin-card flex flex-col gap-4">
        <h2 className="section-title m-0"><Edit3 size={16} /> Product Info</h2>

        {/* Category selector */}
        <div className="field-group">
          <label className="field-label">Category</label>
          {categoriesLoading ? (
            <div className="admin-input flex items-center gap-2 text-stone-400 text-sm">
              <Loader2 size={14} className="animate-spin" /> Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="admin-input text-red-500 text-sm">No categories found. Add one in the database first.</div>
          ) : (
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="admin-input"
            >
              <option value="" disabled>— Select a category —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="field-group">
          <label className="field-label">Product Name</label>
          <input
            type="text" required value={name} onChange={(e) => setName(e.target.value)}
            className="admin-input" placeholder="e.g. Graphic Oversized Tee"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="field-group">
            <label className="field-label">Base Price (₹) — MRP</label>
            <input
              type="number" required value={basePrice} onChange={(e) => setBasePrice(e.target.value)}
              className="admin-input" placeholder="1299" min="0" step="0.01"
            />
          </div>
          <div className="field-group">
            <label className="field-label">Selling Price (₹)</label>
            <input
              type="number" required value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)}
              className="admin-input" placeholder="799" min="0" step="0.01"
            />
          </div>
          <div className="field-group">
            <label className="field-label">Discount (auto)</label>
            <div className="admin-input flex items-center gap-2 bg-stone-100 cursor-default">
              <Percent size={14} className="text-stone-400" />
              <span className={`font-bold ${discount > 0 ? "text-emerald-600" : "text-stone-400"}`}>
                {discount > 0 ? `${discount}% OFF` : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="field-group mt-4">
          <label className="field-label">Short Description (optional)</label>
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)}
            className="admin-input resize-none" rows={3}
            placeholder="A minimalist tee for everyday wear..."
          />
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {/* Featured toggle */}
          <label className="flex items-center gap-3 cursor-pointer w-fit">
            <div
              onClick={() => setIsFeatured(!isFeatured)}
              className={`w-11 h-6 rounded-full transition-colors relative ${isFeatured ? "bg-stone-900" : "bg-stone-300"}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isFeatured ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm font-semibold uppercase tracking-wider">Mark as Featured</span>
          </label>

          {/* Limited Stock section */}
          <div className="flex flex-col gap-3 p-4 rounded-xl border border-stone-200 bg-stone-50/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame size={15} className={isLimitedStock || autoIsLimited ? "text-orange-500" : "text-stone-400"} />
                <span className="text-sm font-semibold uppercase tracking-wider">Limited Stock</span>
                {autoIsLimited && (
                  <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full border border-orange-200">
                    Auto-detected
                  </span>
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setIsLimitedStock(!isLimitedStock)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${isLimitedStock || autoIsLimited ? "bg-orange-500" : "bg-stone-300"
                    }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isLimitedStock || autoIsLimited ? "translate-x-5" : "translate-x-0.5"
                    }`} />
                </div>
              </label>
            </div>
            <p className="text-xs text-stone-500">
              Products with fewer than <strong>10 units</strong> in stock are automatically marked as limited.
            </p>
            <div className="field-group">
              <label className="field-label text-xs">Initial Stock Quantity (optional)</label>
              <input
                type="number" min="0" value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="admin-input text-sm py-2" placeholder="e.g. 50"
              />
              {autoIsLimited && (
                <p className="text-xs text-orange-500 font-medium mt-1 flex items-center gap-1">
                  <Flame size={11} /> Stock is below 10 — will be marked as Limited automatically
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Images */}
      <section className="admin-card flex flex-col gap-4">
        <h2 className="section-title m-0"><ImageIcon size={16} /> Images</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: "Front Image", file: frontImage, ref: frontInputRef, isFront: true },
            { label: "Back Image", file: backImage, ref: backInputRef, isFront: false },
          ].map(({ label, file, ref, isFront }) => (
            <div key={label} className="flex flex-col gap-2">
              <label className="field-label text-center">{label}</label>
              <div
                className="image-drop-zone group"
                onClick={() => ref.current?.click()}
              >
                {file ? (
                  <img src={URL.createObjectURL(file)} alt={label} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <>
                    <Upload className="text-stone-400 mb-2 group-hover:text-stone-700 transition-colors" size={28} />
                    <span className="text-stone-500 text-sm">Click to upload</span>
                  </>
                )}
              </div>
              <input type="file" ref={ref} onChange={(e) => handleFileChange(e, isFront)} accept="image/*" className="hidden" />
              {file && (
                <button type="button" onClick={() => { if (isFront) { setFrontImage(null); if (ref.current) ref.current.value = ""; } else { setBackImage(null); if (ref.current) ref.current.value = ""; } }}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 mx-auto">
                  <X size={12} /> Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <button
        type="submit" disabled={!canSubmit}
        className="admin-btn-primary w-full"
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
        {loading ? "Creating Product..." : "Add Product"}
      </button>
    </form>
  );
}

// ─── Tab: Manage Stock ───────────────────────────────────────────────────────

function ManageStockTab({ onToast }: { onToast: (msg: string, type: "success" | "error") => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [stockUpdates, setStockUpdates] = useState<Record<string, string>>({});
  const [savingVariant, setSavingVariant] = useState<string | null>(null);

  // New variant form
  const [newVariantProductId, setNewVariantProductId] = useState<string | null>(null);
  const [newVariantData, setNewVariantData] = useState({ sku: "", size: "", color: "", colorHex: "", stockQuantity: "" });
  const [savingNewVariant, setSavingNewVariant] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API}/admin/products?limit=100&includeInactive=true`);
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      const arr = data?.data?.data || data?.data || data;
      setProducts(Array.isArray(arr) ? arr : []);
    } catch (err: any) {
      onToast(err.message, "error");
    } finally {
      setLoadingProducts(false);
    }
  }, [onToast]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleStockUpdate = async (productId: string, variantId: string) => {
    const qty = parseInt(stockUpdates[variantId] ?? "0");
    if (isNaN(qty) || qty < 0) { onToast("Enter a valid quantity", "error"); return; }
    setSavingVariant(variantId);
    try {
      const res = await fetch(`${API}/admin/products/${productId}/variants/${variantId}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty }),
      });
      if (!res.ok) throw new Error("Failed to update stock");
      onToast("Stock updated!", "success");
      setStockUpdates((prev) => { const n = { ...prev }; delete n[variantId]; return n; });
      // Refresh product data
      const refreshed = await fetch(`${API}/admin/products/${productId}`);
      const refreshedData = await refreshed.json();
      const updatedProduct = refreshedData?.data || refreshedData;
      setProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)));
    } catch (err: any) {
      onToast(err.message, "error");
    } finally {
      setSavingVariant(null);
    }
  };

  const handleAddVariant = async (productId: string) => {
    if (!newVariantData.sku.trim()) { onToast("SKU is required", "error"); return; }
    setSavingNewVariant(true);
    try {
      const res = await fetch(`${API}/admin/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: newVariantData.sku,
          size: newVariantData.size || undefined,
          color: newVariantData.color || undefined,
          colorHex: newVariantData.colorHex || undefined,
          stockQuantity: parseInt(newVariantData.stockQuantity) || 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to add variant");
      }
      onToast("Variant added with stock!", "success");
      setNewVariantProductId(null);
      setNewVariantData({ sku: "", size: "", color: "", colorHex: "", stockQuantity: "" });
      // Refresh
      const refreshed = await fetch(`${API}/admin/products/${productId}`);
      const refreshedData = await refreshed.json();
      const updatedProduct = refreshedData?.data || refreshedData;
      setProducts((prev) => prev.map((p) => (p.id === productId ? updatedProduct : p)));
    } catch (err: any) {
      onToast(err.message, "error");
    } finally {
      setSavingNewVariant(false);
    }
  };

  const sizes = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

  return (
    <div className="flex flex-col gap-6">
      {/* Search + Refresh */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="admin-input pl-9" placeholder="Search products..."
          />
        </div>
        <button onClick={fetchProducts} className="admin-btn-secondary flex items-center gap-2 px-4">
          <RefreshCw size={14} className={loadingProducts ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loadingProducts && (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-stone-400" size={32} />
        </div>
      )}

      {/* Product list */}
      <div className="flex flex-col gap-3">
        {filteredProducts.map((product) => {
          const isExpanded = expandedProductId === product.id;
          const variants = product.variants ?? [];

          return (
            <div key={product.id} className="admin-card !p-0 overflow-hidden">
              {/* Header */}
              <button
                className="w-full flex items-center justify-between p-4 text-left hover:bg-stone-50 transition-colors"
                onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
              >
                <div className="flex items-center gap-3">
                  {product.images?.[0] && (
                    <img src={product.images[0].url} alt={product.name} className="w-8 h-8 object-cover rounded-md border border-stone-200 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-bold text-stone-900 text-sm">{product.name}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {variants.length} variant{variants.length !== 1 ? "s" : ""} ·{" "}
                      ₹{product.sellingPrice}
                      {product.discountPercent > 0 && (
                        <span className="ml-1 text-emerald-600 font-semibold">{product.discountPercent}% off</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${product.isActive ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                    {product.isActive ? "Active" : "Inactive"}
                  </span>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* Expanded: variants */}
              {isExpanded && (
                <div className="border-t border-stone-200 p-5 flex flex-col gap-4 bg-stone-50/50">
                  {variants.length === 0 && (
                    <p className="text-sm text-stone-400 text-center py-4">No variants yet. Add one below.</p>
                  )}

                  {variants.map((v) => {
                    const available = (v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0);
                    const isLow = available <= 5;
                    return (
                      <div key={v.id} className="flex flex-wrap items-center gap-3 bg-white border border-stone-200 rounded-lg p-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-stone-800">{v.sku}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {v.size && <span className="tag-badge">{v.size}</span>}
                            {v.color && (
                              <span className="tag-badge flex items-center gap-1">
                                {v.color && <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: v.color }} />}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Boxes size={14} className="text-stone-400" />
                          <span className={`font-bold ${isLow ? "text-red-500" : "text-stone-700"}`}>
                            {available} in stock
                          </span>
                          {isLow && <span className="text-xs text-red-400">(Low)</span>}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number" min="0"
                            value={stockUpdates[v.id] ?? ""}
                            onChange={(e) => setStockUpdates((prev) => ({ ...prev, [v.id]: e.target.value }))}
                            placeholder="Set stock"
                            className="admin-input w-28 text-sm py-2"
                          />
                          <button
                            onClick={() => handleStockUpdate(product.id, v.id)}
                            disabled={savingVariant === v.id || stockUpdates[v.id] === undefined || stockUpdates[v.id] === ""}
                            className="admin-btn-primary py-2 px-3 text-xs disabled:opacity-40"
                          >
                            {savingVariant === v.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add New Variant */}
                  {newVariantProductId === product.id ? (
                    <div className="bg-white border-2 border-dashed border-stone-300 rounded-lg p-4 flex flex-col gap-3">
                      <p className="text-sm font-bold uppercase tracking-wider text-stone-600">New Variant</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="field-group col-span-2 md:col-span-1">
                          <label className="field-label text-xs">SKU *</label>
                          <input value={newVariantData.sku}
                            onChange={(e) => setNewVariantData((p) => ({ ...p, sku: e.target.value }))}
                            className="admin-input text-sm py-2" placeholder="TSS-BLK-M" />
                        </div>
                        <div className="field-group">
                          <label className="field-label text-xs">Size</label>
                          <select value={newVariantData.size}
                            onChange={(e) => setNewVariantData((p) => ({ ...p, size: e.target.value }))}
                            className="admin-input text-sm py-2">
                            <option value="">— None —</option>
                            {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="field-group">
                          <label className="field-label text-xs">Color</label>
                          <input value={newVariantData.color}
                            onChange={(e) => setNewVariantData((p) => ({ ...p, color: e.target.value }))}
                            className="admin-input text-sm py-2" placeholder="Midnight Black" />
                        </div>
                        <div className="field-group">
                          <label className="field-label text-xs">Color Hex</label>
                          <div className="flex gap-2 items-center">
                            <input type="color" value={newVariantData.colorHex || "#000000"}
                              onChange={(e) => setNewVariantData((p) => ({ ...p, colorHex: e.target.value }))}
                              className="w-10 h-9 rounded border border-stone-300 cursor-pointer p-0.5" />
                            <input value={newVariantData.colorHex}
                              onChange={(e) => setNewVariantData((p) => ({ ...p, colorHex: e.target.value }))}
                              className="admin-input text-sm py-2 flex-1" placeholder="#0d0d0d" />
                          </div>
                        </div>
                        <div className="field-group">
                          <label className="field-label text-xs">Initial Stock</label>
                          <input type="number" min="0" value={newVariantData.stockQuantity}
                            onChange={(e) => setNewVariantData((p) => ({ ...p, stockQuantity: e.target.value }))}
                            className="admin-input text-sm py-2" placeholder="100" />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => handleAddVariant(product.id)} disabled={savingNewVariant}
                          className="admin-btn-primary py-2 px-4 text-sm flex items-center gap-2">
                          {savingNewVariant ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                          Add Variant
                        </button>
                        <button onClick={() => { setNewVariantProductId(null); setNewVariantData({ sku: "", size: "", color: "", colorHex: "", stockQuantity: "" }); }}
                          className="admin-btn-secondary py-2 px-4 text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setNewVariantProductId(product.id)}
                      className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-stone-300 rounded-lg py-3 text-sm text-stone-500 hover:border-stone-500 hover:text-stone-700 transition-colors"
                    >
                      <Plus size={16} /> Add New Variant
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!loadingProducts && filteredProducts.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p>No products found</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Edit Product ───────────────────────────────────────────────────────

function EditProductTab({ onToast }: { onToast: (msg: string, type: "success" | "error") => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state mirrors selectedProduct
  const [form, setForm] = useState({
    name: "", basePrice: "", sellingPrice: "", description: "",
    shortDescription: "", isActive: true, isFeatured: false, isLimitedStock: false,
  });

  const [existingFront, setExistingFront] = useState<{ id: string, url: string } | null>(null);
  const [existingBack, setExistingBack] = useState<{ id: string, url: string } | null>(null);
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API}/admin/products?limit=100&includeInactive=true`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const arr = data?.data?.data || data?.data || data;
      setProducts(Array.isArray(arr) ? arr : []);
    } catch (err: any) {
      onToast(err.message, "error");
    } finally {
      setLoadingProducts(false);
    }
  }, [onToast]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const selectProduct = (p: Product) => {
    setSelectedProduct(p);
    setForm({
      name: p.name,
      basePrice: String(p.basePrice),
      sellingPrice: String(p.sellingPrice),
      description: p.description ?? "",
      shortDescription: p.shortDescription ?? "",
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      isLimitedStock: p.isLimitedStock ?? false,
    });
    setExistingFront(p.images?.find((i: any) => i.isPrimary) || null);
    setExistingBack(p.images?.find((i: any) => !i.isPrimary) || null);
    setFrontImage(null);
    setBackImage(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedProduct(null), 300);
  };

  const discount =
    form.basePrice && form.sellingPrice
      ? Math.max(0, Math.round(((parseFloat(form.basePrice) - parseFloat(form.sellingPrice)) / parseFloat(form.basePrice)) * 100))
      : 0;

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedProduct) return;

    // Calculate total stock for auto-limited logic
    const totalStock = selectedProduct.variants?.reduce((sum, v) => sum + (v.inventory?.quantity || 0), 0) ?? 0;
    const hasVariants = (selectedProduct.variants?.length || 0) > 0;
    const autoIsLimited = hasVariants && totalStock < 10;

    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/products/${selectedProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          basePrice: parseFloat(form.basePrice),
          sellingPrice: parseFloat(form.sellingPrice),
          description: form.description || undefined,
          shortDescription: form.shortDescription || undefined,
          isActive: form.isActive,
          isFeatured: form.isFeatured,
          isLimitedStock: form.isLimitedStock || autoIsLimited,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update");
      }

      const oldFront = selectedProduct.images?.find((i: any) => i.isPrimary);
      if (frontImage || (!existingFront && oldFront)) {
        if (oldFront) {
          await fetch(`${API}/admin/products/${selectedProduct.id}/images/${oldFront.id}`, { method: 'DELETE' });
        }
        if (frontImage) {
          const url = await uploadImage(frontImage);
          await fetch(`${API}/admin/products/${selectedProduct.id}/images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: [{ url, isPrimary: true }] })
          });
        }
      }

      const oldBack = selectedProduct.images?.find((i: any) => !i.isPrimary);
      if (backImage || (!existingBack && oldBack)) {
        if (oldBack) {
          await fetch(`${API}/admin/products/${selectedProduct.id}/images/${oldBack.id}`, { method: 'DELETE' });
        }
        if (backImage) {
          const url = await uploadImage(backImage);
          await fetch(`${API}/admin/products/${selectedProduct.id}/images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: [{ url, isPrimary: false }] })
          });
        }
      }

      // Re-fetch to get new images array
      const finalRes = await fetch(`${API}/admin/products/${selectedProduct.id}`);
      const finalData = await finalRes.json();
      const updated = finalData?.data || finalData;

      setSelectedProduct(updated);
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setExistingFront(updated.images?.find((i: any) => i.isPrimary) || null);
      setExistingBack(updated.images?.find((i: any) => !i.isPrimary) || null);
      setFrontImage(null);
      setBackImage(null);
      if (frontInputRef.current) frontInputRef.current.value = "";
      if (backInputRef.current) backInputRef.current.value = "";

      onToast("Product updated successfully!", "success");
    } catch (err: any) {
      onToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Search + Refresh */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="admin-input pl-9" placeholder="Search products..."
          />
        </div>
        <button onClick={fetchProducts} className="admin-btn-secondary flex items-center gap-2 px-4">
          <RefreshCw size={14} className={loadingProducts ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loadingProducts && (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-stone-400" size={32} />
        </div>
      )}

      {/* Horizontal product grid */}
      {!loadingProducts && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredProducts.map((p) => (
            <button
              key={p.id}
              onClick={() => selectProduct(p)}
              className={`group relative flex flex-col rounded-xl border overflow-hidden transition-all text-left shadow-sm hover:shadow-md hover:-translate-y-0.5
                ${selectedProduct?.id === p.id
                  ? "border-stone-900 ring-2 ring-stone-900"
                  : "border-stone-200 bg-white hover:border-stone-400"}`}
            >
              {/* Thumbnail */}
              <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden">
                {p.images?.[0] ? (
                  <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={24} className="text-stone-300" />
                  </div>
                )}
                {/* Status badge */}
                <span className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.isActive ? "bg-emerald-500/90 text-white" : "bg-stone-500/80 text-white"
                  }`}>
                  {p.isActive ? "Active" : "Off"}
                </span>
                {/* Edit icon overlay */}
                <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/20 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-2 shadow-lg">
                    <Edit3 size={14} className="text-stone-800" />
                  </div>
                </div>
              </div>
              {/* Info */}
              <div className="p-2.5">
                <p className="font-semibold text-xs text-stone-900 leading-snug line-clamp-2">{p.name}</p>
                <p className="text-xs text-stone-500 mt-0.5">₹{p.sellingPrice}</p>
              </div>
            </button>
          ))}

          {filteredProducts.length === 0 && (
            <div className="col-span-full text-center py-16 text-stone-400">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p>No products found</p>
            </div>
          )}
        </div>
      )}

      {/* Right-side slide-in drawer */}
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: drawerOpen ? 1 : 0, pointerEvents: drawerOpen ? "auto" : "none", zIndex: 9998 }}
      />

      {/* Drawer panel — explicit heights so scroll always works */}
      <div
        style={{
          position: "fixed", top: 0, right: 0,
          width: "min(100vw, 512px)", height: "100vh",
          background: "white", zIndex: 9999,
          display: "flex", flexDirection: "column",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.18)",
          transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
        }}
      >
        {/* ── Drawer header (fixed, never scrolls) */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1rem 1.5rem", borderBottom: "1px solid #e7e5e4",
          background: "#fafaf9", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
            {selectedProduct?.images?.[0] && (
              <img src={selectedProduct.images[0].url} alt={selectedProduct.name}
                style={{ width: 38, height: 38, objectFit: "cover", borderRadius: 8, border: "1px solid #e7e5e4", flexShrink: 0 }} />
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "#1c1917", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {selectedProduct?.name ?? "Select a product"}
              </p>
              <p style={{ fontSize: "0.7rem", color: "#78716c", marginTop: 2 }}>Edit product details</p>
            </div>
          </div>
          <button
            onClick={closeDrawer}
            style={{ padding: 8, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "#57534e", flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e7e5e4")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Drawer scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {selectedProduct ? (
            <>
              {/* Status badges */}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{
                  padding: "3px 10px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 700,
                  background: form.isActive ? "#d1fae5" : "#f5f5f4",
                  color: form.isActive ? "#065f46" : "#78716c",
                }}>
                  {form.isActive ? "Active" : "Inactive"}
                </span>
                {form.isFeatured && (
                  <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 700, background: "#fef3c7", color: "#92400e" }}>
                    ⭐ Featured
                  </span>
                )}
              </div>

              {/* Product Name */}
              <div className="field-group">
                <label className="field-label">Product Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="admin-input"
                  required
                />
              </div>

              {/* Prices */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                <div className="field-group">
                  <label className="field-label">Base (₹)</label>
                  <input type="number" min="0" step="0.01" value={form.basePrice}
                    onChange={(e) => setForm((p) => ({ ...p, basePrice: e.target.value }))}
                    className="admin-input" required />
                </div>
                <div className="field-group">
                  <label className="field-label">Selling (₹)</label>
                  <input type="number" min="0" step="0.01" value={form.sellingPrice}
                    onChange={(e) => setForm((p) => ({ ...p, sellingPrice: e.target.value }))}
                    className="admin-input" required />
                </div>
                <div className="field-group">
                  <label className="field-label">Discount</label>
                  <div className="admin-input" style={{ background: "#fafaf9", display: "flex", alignItems: "center", gap: 4, cursor: "default" }}>
                    <Tag size={11} className="text-stone-400" />
                    <span style={{ fontWeight: 700, fontSize: "0.75rem", color: discount > 0 ? "#059669" : "#a8a29e" }}>
                      {discount > 0 ? `${discount}% OFF` : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="field-group">
                <label className="field-label">Description</label>
                <textarea value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="admin-input" style={{ resize: "none" }} rows={3} />
              </div>

              {/* Short Description */}
              <div className="field-group">
                <label className="field-label">Short Description</label>
                <textarea value={form.shortDescription}
                  onChange={(e) => setForm((p) => ({ ...p, shortDescription: e.target.value }))}
                  className="admin-input" style={{ resize: "none" }} rows={2} />
              </div>

              {/* Toggles */}
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                  <div onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
                    style={{ width: 40, height: 20, borderRadius: 999, background: form.isActive ? "#16a34a" : "#d6d3d1", position: "relative", transition: "background 0.15s", flexShrink: 0, cursor: "pointer" }}>
                    <div style={{ position: "absolute", top: 2, width: 16, height: 16, background: "white", borderRadius: "50%", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "transform 0.15s", transform: form.isActive ? "translateX(22px)" : "translateX(2px)" }} />
                  </div>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Active</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                  <div onClick={() => setForm((p) => ({ ...p, isFeatured: !p.isFeatured }))}
                    style={{ width: 40, height: 20, borderRadius: 999, background: form.isFeatured ? "#f59e0b" : "#d6d3d1", position: "relative", transition: "background 0.15s", flexShrink: 0, cursor: "pointer" }}>
                    <div style={{ position: "absolute", top: 2, width: 16, height: 16, background: "white", borderRadius: "50%", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "transform 0.15s", transform: form.isFeatured ? "translateX(22px)" : "translateX(2px)" }} />
                  </div>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Featured</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                  <div onClick={() => setForm((p) => ({ ...p, isLimitedStock: !p.isLimitedStock }))}
                    style={{ width: 40, height: 20, borderRadius: 999, background: form.isLimitedStock ? "#f97316" : "#d6d3d1", position: "relative", transition: "background 0.15s", flexShrink: 0, cursor: "pointer" }}>
                    <div style={{ position: "absolute", top: 2, width: 16, height: 16, background: "white", borderRadius: "50%", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "transform 0.15s", transform: form.isLimitedStock ? "translateX(22px)" : "translateX(2px)" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Limited</span>
                    <Flame size={14} className={form.isLimitedStock ? "text-orange-500" : "text-stone-400"} />
                  </div>
                </label>
              </div>

              {/* Images */}
              <div style={{ borderTop: "1px solid #e7e5e4", paddingTop: "1rem" }}>
                <p className="section-title" style={{ marginTop: "0.5rem" }}><ImageIcon size={14} /> Images</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  {([
                    { label: "Front", file: frontImage, existing: existingFront, setExisting: setExistingFront, ref: frontInputRef, isFront: true },
                    { label: "Back", file: backImage, existing: existingBack, setExisting: setExistingBack, ref: backInputRef, isFront: false },
                  ] as const).map(({ label, file, existing, setExisting, ref, isFront }) => {
                    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
                      if (e.target.files?.[0]) {
                        if (isFront) setFrontImage(e.target.files[0]);
                        else setBackImage(e.target.files[0]);
                      }
                    };
                    const removeFile = () => {
                      if (file) {
                        if (isFront) setFrontImage(null); else setBackImage(null);
                        if (ref.current) ref.current.value = "";
                      } else if (existing) {
                        setExisting(null);
                      }
                    };
                    return (
                      <div key={label} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <label className="field-label" style={{ textAlign: "center" }}>{label} Image</label>
                        <div className="image-drop-zone group" style={{ height: 160 }} onClick={() => ref.current?.click()}>
                          {file ? (
                            <img src={URL.createObjectURL(file)} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                          ) : existing ? (
                            <img src={existing.url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                          ) : (
                            <>
                              <Upload className="text-stone-400 group-hover:text-stone-700" style={{ marginBottom: 6 }} size={22} />
                              <span style={{ fontSize: "0.7rem", color: "#78716c" }}>Click to upload</span>
                            </>
                          )}
                        </div>
                        <input type="file" ref={ref} onChange={handleFile} accept="image/*" style={{ display: "none" }} />
                        {(file || existing) && (
                          <button type="button" onClick={removeFile}
                            style={{ fontSize: "0.7rem", color: "#ef4444", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                            <X size={11} /> Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Save button */}
              <div style={{ borderTop: "1px solid #e7e5e4", paddingTop: "1rem", paddingBottom: "0.5rem" }}>
                <button
                  onClick={() => handleSave()}
                  disabled={saving}
                  className="admin-btn-primary"
                  style={{ width: "100%", padding: "0.875rem", fontSize: "0.85rem" }}
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? "Saving Changes..." : "Save All Changes"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-stone-400">
              <Loader2 className="animate-spin mb-2" size={24} />
              <p className="text-sm">Loading product...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Page ─────────────────────────────────────────────────────────

type Tab = "add" | "stock" | "edit";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "add", label: "Add Product", icon: <Plus size={16} /> },
  { id: "stock", label: "Manage Stock", icon: <Boxes size={16} /> },
  { id: "edit", label: "Edit Products", icon: <Edit3 size={16} /> },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("add");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const handleToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
  };

  return (
    <>
      <style>{`
        .admin-card {
          background: white;
          border: 1px solid #e7e5e4;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #44403c;
          border-bottom: 2px solid #1c1917;
          padding-bottom: 0.5rem;
          margin-bottom: 1.25rem;
        }
        .field-group { display: flex; flex-direction: column; gap: 0.375rem; }
        .field-label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #57534e;
        }
        .admin-input {
          border: 1px solid #d6d3d1;
          border-radius: 8px;
          padding: 0.625rem 0.75rem;
          background: #fafaf9;
          font-size: 0.875rem;
          color: #1c1917;
          width: 100%;
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
        }
        .admin-input:focus {
          border-color: #1c1917;
          box-shadow: 0 0 0 2px rgba(28,25,23,0.08);
        }
        .admin-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: #1c1917;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1.25rem;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: background 0.15s, opacity 0.15s;
        }
        .admin-btn-primary:hover:not(:disabled) { background: #44403c; }
        .admin-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .admin-btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: white;
          color: #44403c;
          border: 1px solid #d6d3d1;
          border-radius: 8px;
          padding: 0.625rem 1rem;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .admin-btn-secondary:hover { background: #f5f5f4; border-color: #a8a29e; }
        .image-drop-zone {
          border: 2px dashed #d6d3d1;
          border-radius: 12px;
          background: #fafaf9;
          height: 140px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          overflow: hidden;
          transition: border-color 0.15s;
        }
        .image-drop-zone:hover { border-color: #1c1917; }
        .tag-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: #f5f5f4;
          color: #57534e;
          border-radius: 999px;
          padding: 0.1rem 0.6rem;
          font-size: 0.7rem;
          font-weight: 600;
          border: 1px solid #e7e5e4;
        }
        select.admin-input { appearance: auto; }
      `}</style>

      <div className="min-h-screen bg-[#f9f7f4] pt-28 pb-20 px-4 md:px-8 font-sans text-stone-900">
        <div className="max-w-5xl mx-auto flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <h1 className="font-serif text-5xl font-bold uppercase leading-none tracking-tight text-stone-900">
              Admin Portal
            </h1>
            <p className="text-stone-500">Manage your catalog, inventory & product details.</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-stone-200/60 rounded-xl w-fit">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all
                  ${activeTab === tab.id
                    ? "bg-white text-stone-900 shadow"
                    : "text-stone-500 hover:text-stone-700"}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "add" && <AddProductTab onToast={handleToast} />}
          {activeTab === "stock" && <ManageStockTab onToast={handleToast} />}
          {activeTab === "edit" && <EditProductTab onToast={handleToast} />}
        </div>
      </div>

      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  );
}
