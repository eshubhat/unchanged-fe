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
  Flame,
  Trash2,
  AlertTriangle,
  ShoppingBag,
  TrendingDown,
  Calendar,
  Clock,
  BarChart2,
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

interface Address {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
}

interface OrderItem {
  id: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productSnapshot: { name: string; size?: string; sku?: string; imageUrl?: string };
}

interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  user?: { email: string; firstName: string; lastName: string; phone?: string };
  shippingAddress: Address;
  items?: OrderItem[];
  statusHistory?: { toStatus: string; createdAt: string; note?: string }[];
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

const uploadImage = async (file: File) => {
  const presignRes = await fetch(`${API}/uploads/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder: "products", contentType: file.type, fileSizeBytes: file.size }),
  });
  if (!presignRes.ok) throw new Error("Failed to get presigned URL");
  const presignResJson = await presignRes.json();
  const presignData = presignResJson.data || presignResJson;

  const formData = new FormData();
  formData.append("file", file);
  const uploadRes = await fetch(presignData.uploadUrl, { method: "POST", body: formData });
  if (!uploadRes.ok) throw new Error("Failed to upload file");

  const uploadResJson = await uploadRes.json();
  const uploadData = uploadResJson.data || uploadResJson;

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
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  // Per-size stock quantities
  const SIZE_LIST = ["XS", "S", "M", "L", "XL", "XXL"] as const;
  type SizeKey = typeof SIZE_LIST[number];
  const [sizeStock, setSizeStock] = useState<Record<SizeKey, string>>({
    XS: "", S: "", M: "", L: "", XL: "", XXL: "",
  });

  // Total stock across all sizes
  const totalStock = SIZE_LIST.reduce((sum, s) => sum + (parseInt(sizeStock[s]) || 0), 0);
  // Auto-flag as limited if total stock < 10
  const autoIsLimited = totalStock > 0 && totalStock < 10;

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

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

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const res = await fetch(`${API}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName }),
      });
      if (!res.ok) throw new Error("Failed to create category");
      const newCat = await res.json();
      setCategories((prev) => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryId(newCat.id);
      setIsAddingCategory(false);
      setNewCategoryName("");
      onToast("Category created successfully!", "success");
    } catch (err: any) {
      onToast(err.message, "error");
    } finally {
      setCreatingCategory(false);
    }
  };

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
      // Build variants — one per size that has stock > 0
      const variants = SIZE_LIST
        .filter((s) => parseInt(sizeStock[s]) > 0)
        .map((s) => ({
          sku: `${name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "PROD"}-${s}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
          size: s,
          isActive: true,
          stockQuantity: parseInt(sizeStock[s]),
        }));

      // If no sizes filled in, create a generic one-size variant
      if (variants.length === 0) {
        variants.push({
          sku: `VAR-${Date.now()}`,
          size: "M",
          isActive: true,
          stockQuantity: 0,
        });
      }

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
          variants,
        }),
      });
      if (!productRes.ok) {
        const err = await productRes.json();
        throw new Error(err.message || "Failed to create product");
      }
      const resData = await productRes.json();
      const product = resData.data || resData;

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
      setIsFeatured(false); setIsLimitedStock(false);
      setSizeStock({ XS: "", S: "", M: "", L: "", XL: "", XXL: "" });
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
          <div className="flex items-center justify-between">
            <label className="field-label">Category</label>
            <button
              type="button"
              onClick={() => setIsAddingCategory(!isAddingCategory)}
              className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 font-medium"
            >
              {isAddingCategory ? "Cancel" : <><Plus size={12} /> New Category</>}
            </button>
          </div>
          {isAddingCategory ? (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="admin-input flex-1"
                placeholder="e.g. Hoodies"
                autoFocus
              />
              <button
                type="button"
                onClick={handleCreateCategory}
                disabled={creatingCategory || !newCategoryName.trim()}
                className="admin-btn-primary py-2 px-4 whitespace-nowrap"
              >
                {creatingCategory ? <Loader2 size={14} className="animate-spin" /> : "Create"}
              </button>
            </div>
          ) : categoriesLoading ? (
            <div className="admin-input flex items-center gap-2 text-stone-400 text-sm">
              <Loader2 size={14} className="animate-spin" /> Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="admin-input text-red-500 text-sm">No categories found. Add one.</div>
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

          {/* Per-Size Stock Section */}
          <div className="flex flex-col gap-4 p-4 rounded-xl border border-stone-200 bg-stone-50/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes size={15} className="text-stone-500" />
                <span className="text-sm font-semibold uppercase tracking-wider">Stock by Size</span>
                {totalStock > 0 && (
                  <span className="text-xs bg-stone-100 text-stone-600 font-bold px-2 py-0.5 rounded-full border border-stone-200">
                    {totalStock} total units
                  </span>
                )}
              </div>
              {autoIsLimited && (
                <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full border border-orange-200 flex items-center gap-1">
                  <Flame size={10} /> Auto Limited
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500">
              Enter the stock quantity for each size. Leave blank or 0 to skip that size.
              Sizes with stock will be created as separate variants.
            </p>

            {/* Size grid */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {SIZE_LIST.map((size) => {
                const val = parseInt(sizeStock[size]) || 0;
                const isLow = val > 0 && val < 5;
                const isFull = val >= 10;
                return (
                  <div key={size} className="flex flex-col gap-1.5">
                    <div className={`text-center text-xs font-bold uppercase tracking-wider py-1 rounded-md border
                      ${val === 0 ? "bg-stone-100 border-stone-200 text-stone-400"
                        : isLow ? "bg-orange-50 border-orange-300 text-orange-700"
                          : isFull ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                            : "bg-stone-800 border-stone-900 text-white"}`}>
                      {size}
                    </div>
                    <input
                      type="number" min="0" max="9999"
                      value={sizeStock[size]}
                      onChange={(e) => setSizeStock((prev) => ({ ...prev, [size]: e.target.value }))}
                      className="admin-input text-sm py-2 text-center"
                      placeholder="0"
                    />
                    {val > 0 && (
                      <p className={`text-[10px] text-center font-semibold
                        ${isLow ? "text-orange-500" : "text-stone-400"}`}>
                        {isLow ? "⚠ Low" : `${val} units`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total + Limited flag */}
            {totalStock > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                <span className="text-xs text-stone-500">
                  <strong>{SIZE_LIST.filter((s) => parseInt(sizeStock[s]) > 0).length}</strong> size{SIZE_LIST.filter((s) => parseInt(sizeStock[s]) > 0).length !== 1 ? "s" : ""} with stock
                </span>
                <span className="text-xs font-bold text-stone-700">Total: {totalStock} units</span>
              </div>
            )}
          </div>

          {/* Limited Stock toggle */}
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
                  className={`w-11 h-6 rounded-full transition-colors relative ${isLimitedStock || autoIsLimited ? "bg-orange-500" : "bg-stone-300"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isLimitedStock || autoIsLimited ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
              </label>
            </div>
            <p className="text-xs text-stone-500">
              Products with fewer than <strong>10 units</strong> total are automatically marked as limited.
            </p>
            {autoIsLimited && (
              <p className="text-xs text-orange-500 font-medium flex items-center gap-1">
                <Flame size={11} /> Total stock is below 10 — will be marked as Limited automatically
              </p>
            )}
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

  const ORDERED_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

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

          // Build a size → variant map for ordered display
          const sizeVariantMap = new Map<string, Variant>();
          const nonSizeVariants: Variant[] = [];
          for (const v of variants) {
            if (v.size) sizeVariantMap.set(v.size, v);
            else nonSizeVariants.push(v);
          }
          const hasSizes = sizeVariantMap.size > 0;
          const totalStock = variants.reduce((s, v) => s + (v.inventory?.quantity ?? 0), 0);
          const totalAvail = variants.reduce((s, v) => s + Math.max(0, (v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0)), 0);

          return (
            <div key={product.id} className="admin-card !p-0 overflow-hidden">
              {/* Header */}
              <button
                className="w-full flex items-center justify-between p-4 text-left hover:bg-stone-50 transition-colors"
                onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
              >
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    {product.images?.[0] && (
                      <img src={product.images[0].url} alt={product.name} className="w-8 h-8 shrink-0 object-cover rounded-md border border-stone-200" style={{ width: 32, height: 32 }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-stone-900 text-sm">{product.name}</p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        ₹{product.sellingPrice}
                        {product.discountPercent > 0 && (
                          <span className="ml-1 text-emerald-600 font-semibold">{product.discountPercent}% off</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Size stock pills — quick overview (moved below product info) */}
                  {hasSizes && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ORDERED_SIZES.map((size) => {
                        const v = sizeVariantMap.get(size);
                        const qty = v ? Math.max(0, (v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0)) : null;
                        if (qty === null) return (
                          <div key={size} className="flex flex-col items-center gap-0.5">
                            <span className="text-[9px] font-bold text-stone-300 uppercase">{size}</span>
                            <span className="text-[10px] text-stone-300">—</span>
                          </div>
                        );
                        const isOut = qty === 0;
                        const isLow = qty > 0 && qty <= 5;
                        return (
                          <div key={size} className="flex flex-col items-center gap-0.5">
                            <span className="text-[9px] font-bold uppercase text-stone-500">{size}</span>
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded min-w-[24px] text-center
                              ${isOut ? "bg-red-100 text-red-600" : isLow ? "bg-orange-100 text-orange-600" : "bg-emerald-100 text-emerald-700"}`}>
                              {qty}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {hasSizes && (
                    <span className="text-xs text-stone-500 hidden md:block">
                      {totalAvail}/{totalStock}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${product.isActive ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                    {product.isActive ? "Active" : "Inactive"}
                  </span>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* Expanded: variants */}
              {isExpanded && (
                <div className="border-t border-stone-200 p-5 flex flex-col gap-5 bg-stone-50/50">
                  {variants.length === 0 && (
                    <p className="text-sm text-stone-400 text-center py-4">No variants yet. Add one below.</p>
                  )}

                  {/* ── Size Grid View ────────────────────────────────────────── */}
                  {hasSizes && (
                    <div className="bg-white border border-stone-200 rounded-xl p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-4 flex items-center gap-2">
                        <Boxes size={13} /> Stock by Size
                      </p>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                        {ORDERED_SIZES.map((size) => {
                          const v = sizeVariantMap.get(size);
                          if (!v) {
                            // Size doesn't exist — show add button
                            return (
                              <div key={size} className="flex flex-col items-center gap-2">
                                <div className="w-full py-2 text-center text-xs font-bold uppercase tracking-wider bg-stone-100 text-stone-300 rounded-md border border-dashed border-stone-200">
                                  {size}
                                </div>
                                <button
                                  onClick={() => {
                                    setNewVariantProductId(product.id);
                                    setNewVariantData((p) => ({ ...p, size }));
                                  }}
                                  className="w-full text-[10px] text-stone-400 hover:text-stone-700 border border-dashed border-stone-300 rounded py-1 transition-colors"
                                >
                                  + Add
                                </button>
                              </div>
                            );
                          }
                          const total = v.inventory?.quantity ?? 0;
                          const reserved = v.inventory?.reservedQuantity ?? 0;
                          const avail = Math.max(0, total - reserved);
                          const isOut = avail === 0;
                          const isLow = avail > 0 && avail <= 5;
                          return (
                            <div key={size} className="flex flex-col gap-2">
                              <div className={`w-full py-2 text-center text-xs font-bold uppercase tracking-wider rounded-md border
                                ${isOut ? "bg-red-50 border-red-300 text-red-600"
                                  : isLow ? "bg-orange-50 border-orange-300 text-orange-700"
                                    : "bg-emerald-50 border-emerald-300 text-emerald-700"}`}>
                                {size}
                              </div>
                              {/* Stock display */}
                              <div className="text-center">
                                <p className={`text-lg font-bold leading-none ${isOut ? "text-red-500" : isLow ? "text-orange-500" : "text-stone-800"}`}>
                                  {avail}
                                </p>
                                <p className="text-[9px] text-stone-400 mt-0.5">
                                  {reserved > 0 ? `${reserved} reserved` : "available"}
                                </p>
                              </div>
                              {/* Update input */}
                              <div className="flex flex-col gap-1">
                                <input
                                  type="number" min="0"
                                  value={stockUpdates[v.id] ?? ""}
                                  onChange={(e) => setStockUpdates((prev) => ({ ...prev, [v.id]: e.target.value }))}
                                  placeholder="Set"
                                  className="admin-input text-xs py-1.5 text-center"
                                />
                                <button
                                  onClick={() => handleStockUpdate(product.id, v.id)}
                                  disabled={savingVariant === v.id || stockUpdates[v.id] === undefined || stockUpdates[v.id] === ""}
                                  className="admin-btn-primary py-1.5 text-[10px] disabled:opacity-40 w-full"
                                >
                                  {savingVariant === v.id ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                                  {savingVariant === v.id ? "..." : "Save"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Totals row */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100 text-xs text-stone-500">
                        <span>Total stock: <strong className="text-stone-800">{totalStock}</strong></span>
                        <span>Available: <strong className={totalAvail <= 0 ? "text-red-500" : totalAvail <= 10 ? "text-orange-500" : "text-emerald-600"}>{totalAvail}</strong></span>
                        <span>Reserved: <strong className="text-stone-800">{totalStock - totalAvail}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* ── Non-size variants (fallback) ──────────────────────── */}
                  {nonSizeVariants.map((v) => {
                    const available = (v.inventory?.quantity ?? 0) - (v.inventory?.reservedQuantity ?? 0);
                    const isLow = available <= 5;
                    return (
                      <div key={v.id} className="flex flex-wrap items-center gap-3 bg-white border border-stone-200 rounded-lg p-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-stone-800">{v.sku}</p>
                          {v.color && (
                            <span className="tag-badge flex items-center gap-1 mt-1">
                              <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: v.color }} />
                              {v.color}
                            </span>
                          )}
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
                            {ORDERED_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
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
                      <Plus size={16} /> Add New Variant / Size
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!selectedProduct) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/admin/products/${selectedProduct.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete product");
      }
      setProducts((prev) => prev.filter((p) => p.id !== selectedProduct.id));
      closeDrawer();
      setConfirmDelete(false);
      onToast(`"${selectedProduct.name}" deleted successfully.`, "success");
    } catch (err: any) {
      onToast(err.message, "error");
    } finally {
      setDeleting(false);
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

              {/* Actions footer */}
              <div style={{ borderTop: "1px solid #e7e5e4", paddingTop: "1rem", paddingBottom: "0.5rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <button
                  onClick={() => handleSave()}
                  disabled={saving || deleting}
                  className="admin-btn-primary"
                  style={{ width: "100%", padding: "0.875rem", fontSize: "0.85rem" }}
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? "Saving Changes..." : "Save All Changes"}
                </button>
                {/* Delete button — opens confirmation */}
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving || deleting}
                  style={{
                    width: "100%", padding: "0.75rem", fontSize: "0.8rem", fontWeight: 600,
                    background: "transparent", border: "1.5px solid #fca5a5", borderRadius: 8,
                    color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center",
                    justifyContent: "center", gap: 6, transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <Trash2 size={15} />
                  Delete Product
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

      {/* ── Delete confirmation modal */}
      {confirmDelete && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
          }}
          onClick={() => setConfirmDelete(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white", borderRadius: 16, padding: "2rem",
              maxWidth: 400, width: "100%", boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
              display: "flex", flexDirection: "column", gap: "1rem", textAlign: "center",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ background: "#fef2f2", borderRadius: "50%", padding: "1rem" }}>
                <AlertTriangle size={28} color="#dc2626" />
              </div>
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: "1.05rem", color: "#1c1917", marginBottom: 6 }}>Delete Product?</p>
              <p style={{ fontSize: "0.85rem", color: "#78716c", lineHeight: 1.5 }}>
                You are about to permanently delete <strong style={{ color: "#1c1917" }}>{selectedProduct?.name}</strong>.
                This action cannot be undone.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  flex: 1, padding: "0.75rem", borderRadius: 8, border: "1.5px solid #e7e5e4",
                  background: "white", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", color: "#57534e",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: "0.75rem", borderRadius: 8, border: "none",
                  background: deleting ? "#fca5a5" : "#dc2626", cursor: deleting ? "not-allowed" : "pointer",
                  fontWeight: 700, fontSize: "0.875rem", color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Sales & Inventory Dashboard ────────────────────────────────────────────

interface KPIData {
  today: { orders: number; revenue: string };
  thisMonth: { orders: number; revenue: string };
  totalUsers: number;
  lowStockCount: number;
}

interface TopProduct {
  product_id: string;
  product_name: string;
  units_sold: number;
  revenue: string;
}

interface LowStockItem {
  sku: string;
  product_name: string;
  quantity: number;
  reserved_quantity: number;
  available: number;
  low_stock_threshold: number;
}

interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  subtotal: number;
  discountAmount: number;
  createdAt: string;
  shippingAddress?: { fullName?: string; phone?: string; line1?: string; line2?: string; city?: string; state?: string; zip?: string; pincode?: string; };
  user?: { firstName: string; lastName?: string; email: string };
  items?: {
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    productSnapshot: {
      productName: string;
      sku: string;
      size?: string;
      color?: string;
      primaryImageUrl?: string;
    };
  }[];
}

interface StockItem {
  id: string;
  name: string;
  sellingPrice: number;
  images?: { url: string; isPrimary: boolean }[];
  variants?: {
    id: string;
    sku: string;
    size?: string;
    color?: string;
    isActive: boolean;
    inventory?: { quantity: number; reservedQuantity: number };
  }[];
}

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  pending: { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  confirmed: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  processing: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
  shipped: { bg: "#f0f9ff", color: "#0369a1", border: "#bae6fd" },
  out_for_delivery: { bg: "#fdf4ff", color: "#7e22ce", border: "#e9d5ff" },
  delivered: { bg: "#f0fdf4", color: "#15803d", border: "#86efac" },
  cancelled: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  returned: { bg: "#fafafa", color: "#57534e", border: "#e7e5e4" },
  refunded: { bg: "#fafafa", color: "#57534e", border: "#e7e5e4" },
};

function statusLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmt(n: number | string) {
  return "\u20b9" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function KPICard({
  icon, label, value, sub, accent,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e7e5e4",
        borderRadius: 14,
        padding: "1.25rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        flex: 1,
        minWidth: 150,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: accent ?? "#78716c" }}>
        {icon}
        <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {label}
        </span>
      </div>
      <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1c1917", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: "0.72rem", color: "#a8a29e" }}>{sub}</p>}
    </div>
  );
}

function OrderCard({ order }: { order: AdminOrder }) {
  const [expanded, setExpanded] = useState(false);
  const sc = STATUS_COLORS[order.status] ?? { bg: "#f5f5f4", color: "#57534e", border: "#e7e5e4" };
  const addr = order.shippingAddress;

  return (
    <div
      style={{
        background: "white", border: "1px solid #e7e5e4", borderRadius: 12,
        padding: "0.875rem 1rem", boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
      }}
    >
      {/* Order header (clickable) */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "0.5rem", cursor: "pointer", userSelect: "none"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <span style={{ fontWeight: 800, fontSize: "0.82rem", color: "#1c1917", fontFamily: "monospace" }}>{order.orderNumber}</span>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
            {statusLabel(order.status)}
          </span>
          {order.paymentStatus === "paid" && (
            <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "2px 6px", borderRadius: 999, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>Paid</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {order.user && (
            <span style={{ fontSize: "0.72rem", color: "#78716c" }}>{order.user.firstName} {order.user.lastName ?? ""}</span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.68rem", color: "#a8a29e" }}>
            <Clock size={11} />
            {new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "#1c1917" }}>{fmt(order.totalAmount)}</span>
          {expanded ? <ChevronUp size={16} color="#a8a29e" /> : <ChevronDown size={16} color="#a8a29e" />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f5f5f4", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Address & Customer details */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", background: "#fafaf9", padding: "0.75rem", borderRadius: 8 }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "0.7rem", fontWeight: 700, color: "#a8a29e", textTransform: "uppercase" }}>Customer</p>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#1c1917", fontWeight: 600 }}>{order.user?.firstName} {order.user?.lastName}</p>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#78716c" }}>{order.user?.email}</p>
              {addr?.phone && <p style={{ margin: 0, fontSize: "0.75rem", color: "#78716c" }}>{addr.phone}</p>}
            </div>
            {addr && (
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "0.7rem", fontWeight: 700, color: "#a8a29e", textTransform: "uppercase" }}>Shipping Address</p>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#1c1917" }}>{addr.fullName || `${order.user?.firstName} ${order.user?.lastName ?? ""}`}</p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#78716c" }}>{addr.line1}</p>
                {addr.line2 && <p style={{ margin: 0, fontSize: "0.75rem", color: "#78716c" }}>{addr.line2}</p>}
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#78716c" }}>{addr.city}, {addr.state} {addr.pincode ?? addr.zip}</p>
              </div>
            )}
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "0.7rem", fontWeight: 700, color: "#a8a29e", textTransform: "uppercase" }}>Order Summary</p>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#78716c", marginBottom: 2 }}>
                <span>Subtotal</span><span>{fmt(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#16a34a", marginBottom: 2 }}>
                  <span>Discount</span><span>-{fmt(order.discountAmount)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "#1c1917", marginTop: 4, paddingTop: 4, borderTop: "1px solid #e7e5e4" }}>
                <span>Total</span><span>{fmt(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Order items */}
          {order.items && order.items.length > 0 && (
            <div>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.7rem", fontWeight: 700, color: "#a8a29e", textTransform: "uppercase" }}>Items</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "white", border: "1px solid #e7e5e4", borderRadius: 8, padding: "0.5rem 0.75rem", flex: "1 1 250px" }}
                  >
                    {item.productSnapshot.primaryImageUrl && (
                      <img src={item.productSnapshot.primaryImageUrl} alt={item.productSnapshot.productName}
                        style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid #e7e5e4", flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1c1917", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.productSnapshot.productName}</p>
                      <p style={{ fontSize: "0.7rem", color: "#78716c", margin: 0 }}>
                        {[item.productSnapshot.size, item.productSnapshot.color].filter(Boolean).join(" · ") || item.productSnapshot.sku}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "#1c1917" }}>{fmt(item.unitPrice)}</p>
                      <p style={{ margin: 0, fontSize: "0.7rem", color: "#78716c" }}>Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SalesDashboardTab({ onToast }: { onToast: (msg: string, type: "success" | "error") => void }) {
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");
  const [activeSection, setActiveSection] = useState<"orders" | "stock">("orders");
  // Date range for orders (default: last 30 days)
  const defaultTo = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);

  // const token = localStorage.getItem("unchanged_token");
  // const authHeader = token ? { Authorization: `Bearer ${token}` } as Record<string, string> : {} as Record<string, string>;

  const fetchKPIAndStock = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("unchanged_token");
    const authH = token ? { Authorization: `Bearer ${token}` } as Record<string, string> : {} as Record<string, string>;
    // Add end-of-day time so toDate includes the full day
    const toEOD = toDate ? `${toDate}T23:59:59` : undefined;
    try {
      const [kpiRes, topRes, lowRes, stockRes] = await Promise.all([
        fetch(`${API}/admin/analytics/dashboard`, { headers: authH }),
        fetch(`${API}/admin/analytics/products/top?from=${fromDate}&to=${toEOD}&limit=20`, { headers: authH }),
        fetch(`${API}/admin/analytics/inventory/low-stock?threshold=20`, { headers: authH }),
        fetch(`${API}/admin/products?limit=100&includeInactive=true`),
      ]);

      if (kpiRes.ok) {
        const d = await kpiRes.json();
        setKpi(d.data ?? d);
      }
      if (topRes.ok) {
        const d = await topRes.json();
        setTopProducts(Array.isArray(d.data ?? d) ? (d.data ?? d) : []);
      }
      if (lowRes.ok) {
        const d = await lowRes.json();
        setLowStock(Array.isArray(d.data ?? d) ? (d.data ?? d) : []);
      }
      if (stockRes.ok) {
        const d = await stockRes.json();
        const arr = d?.data?.data || d?.data || d;
        setStockItems(Array.isArray(arr) ? arr : []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
      onToast("Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, onToast]);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    const token = localStorage.getItem("unchanged_token");
    const authH = token ? { Authorization: `Bearer ${token}` } as Record<string, string> : {} as Record<string, string>;
    // toDate must cover the full day — append end-of-day so orders placed at any time today are included
    const toEOD = toDate ? `${toDate}T23:59:59` : undefined;
    try {
      const params = new URLSearchParams({
        limit: "100",
        sortBy: "newest",
        ...(fromDate && { fromDate }),
        ...(toEOD && { toDate: toEOD }),
      });
      const res = await fetch(`${API}/admin/orders?${params}`, { headers: authH });
      if (!res.ok) throw new Error(`Orders fetch failed: ${res.status}`);
      const d = await res.json();
      const arr = d?.data?.data || d?.data || d;
      setOrders(Array.isArray(arr) ? arr : []);
    } catch (err: any) {
      onToast(err.message || "Failed to load orders", "error");
    } finally {
      setOrdersLoading(false);
    }
  }, [fromDate, toDate, onToast]);

  useEffect(() => { fetchKPIAndStock(); }, [fetchKPIAndStock]);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleRefresh = () => { fetchKPIAndStock(); fetchOrders(); };

  // Group orders by date (YYYY-MM-DD)
  const filteredOrders = orders.filter((o) => {
    const q = orderSearch.toLowerCase();
    if (!q) return true;
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      (o.user?.firstName ?? "").toLowerCase().includes(q) ||
      (o.user?.email ?? "").toLowerCase().includes(q) ||
      o.items?.some((i) => i.productSnapshot.productName.toLowerCase().includes(q))
    );
  });

  const ordersByDay: { date: string; label: string; orders: AdminOrder[] }[] = (() => {
    const map = new Map<string, AdminOrder[]>();
    for (const o of filteredOrders) {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, os]) => ({ date, label: formatDayLabel(date), orders: os }));
  })();

  // Stock tracker
  const filteredStock = stockItems.filter((p) =>
    p.name.toLowerCase().includes(stockSearch.toLowerCase())
  );

  // Map top products units sold by product id for the stock table
  const unitsSoldMap = new Map(topProducts.map((t) => [t.product_id, t.units_sold]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Header banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1c1917 0%, #292524 100%)",
          borderRadius: 16,
          padding: "1.5rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "0.75rem", display: "flex" }}>
            <BarChart2 size={24} style={{ color: "#86efac" }} />
          </div>
          <div>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.65, marginBottom: 2 }}>
              Sales & Inventory
            </p>
            <p style={{ fontSize: "1.25rem", fontWeight: 800, lineHeight: 1 }}>Dashboard</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="date" value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "0.4rem 0.75rem", color: "white", fontSize: "0.78rem", colorScheme: "dark" }}
            />
            <span style={{ opacity: 0.5, fontSize: "0.75rem" }}>to</span>
            <input
              type="date" value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "0.4rem 0.75rem", color: "white", fontSize: "0.78rem", colorScheme: "dark" }}
            />
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading && ordersLoading}
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", color: "white", borderRadius: 8, padding: "0.5rem 1rem", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={13} className={(loading || ordersLoading) ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error */}
      {error && !loading && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem", color: "#dc2626" }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: "0.85rem" }}>{error}</span>
          <button onClick={handleRefresh} style={{ marginLeft: "auto", fontSize: "0.78rem", background: "none", border: "1px solid #fca5a5", borderRadius: 6, padding: "4px 10px", color: "#dc2626", cursor: "pointer" }}>Retry</button>
        </div>
      )}

      {/* ── KPI Cards */}
      {loading ? (
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ flex: 1, minWidth: 150, height: 90, background: "#f5f5f4", borderRadius: 14, animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      ) : kpi ? (
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <KPICard icon={<ShoppingBag size={15} />} label="Today's Orders" value={String(kpi.today.orders)} sub={fmt(kpi.today.revenue) + " revenue"} accent="#7c3aed" />
          <KPICard icon={<TrendingDown size={15} />} label="This Month" value={String(kpi.thisMonth.orders) + " orders"} sub={fmt(kpi.thisMonth.revenue) + " revenue"} accent="#0369a1" />
          <KPICard icon={<Boxes size={15} />} label="Low Stock Alerts" value={String(kpi.lowStockCount)} sub="variants below threshold" accent={kpi.lowStockCount > 0 ? "#dc2626" : "#16a34a"} />
          <KPICard icon={<Package size={15} />} label="Total Products" value={String(stockItems.length)} sub={"in catalog"} accent="#44403c" />
        </div>
      ) : null}

      {/* ── Top Sellers + Low Stock side-by-side */}
      {!loading && (topProducts.length > 0 || lowStock.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {/* Top products */}
          <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 14, padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <p className="section-title" style={{ marginTop: 0 }}><TrendingDown size={13} /> Top Sellers ({fromDate} – {toDate})</p>
            {topProducts.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#a8a29e", textAlign: "center", padding: "1.5rem 0" }}>No paid orders in this period</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {topProducts.slice(0, 8).map((p, i) => (
                  <div key={p.product_id ?? i} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <span style={{ width: 20, fontSize: "0.7rem", fontWeight: 800, color: i < 3 ? "#1c1917" : "#a8a29e", flexShrink: 0, textAlign: "right" }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1c1917", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.product_name}</p>
                      <p style={{ fontSize: "0.68rem", color: "#78716c", margin: 0 }}>{fmt(p.revenue)}</p>
                    </div>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 999, padding: "2px 8px", flexShrink: 0 }}>
                      {p.units_sold} sold
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low stock */}
          <div style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 14, padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <p className="section-title" style={{ marginTop: 0 }}><AlertTriangle size={13} /> Low Stock (≤20 units)</p>
            {lowStock.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#16a34a", textAlign: "center", padding: "1.5rem 0", fontWeight: 600 }}>✓ All variants well-stocked</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 260, overflowY: "auto" }}>
                {lowStock.map((item, i) => {
                  const pct = Math.max(0, Math.min(100, (item.available / Math.max(item.quantity, 1)) * 100));
                  const isOut = item.available <= 0;
                  return (
                    <div key={item.sku + i} style={{ borderBottom: "1px solid #f5f5f4", paddingBottom: "0.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1c1917", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{item.product_name}</p>
                          <p style={{ fontSize: "0.65rem", color: "#a8a29e", margin: 0 }}>{item.sku}</p>
                        </div>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: isOut ? "#dc2626" : "#c2410c", background: isOut ? "#fef2f2" : "#fff7ed", border: `1px solid ${isOut ? "#fecaca" : "#fed7aa"}`, borderRadius: 999, padding: "2px 8px", flexShrink: 0 }}>
                          {item.available} left
                        </span>
                      </div>
                      <div style={{ height: 4, background: "#f5f5f4", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: isOut ? "#dc2626" : pct < 30 ? "#f97316" : "#f59e0b", borderRadius: 999, transition: "width 0.3s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Section toggle: Orders vs Stock */}
      <div style={{ display: "flex", gap: "0.5rem", background: "rgba(120,113,108,0.1)", padding: 4, borderRadius: 12, width: "fit-content" }}>
        {(["orders", "stock"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            style={{
              padding: "0.5rem 1.25rem", borderRadius: 9, border: "none", cursor: "pointer",
              fontSize: "0.8rem", fontWeight: 600,
              background: activeSection === s ? "white" : "transparent",
              color: activeSection === s ? "#1c1917" : "#78716c",
              boxShadow: activeSection === s ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.15s",
            }}
          >
            {s === "orders" ? <><ShoppingBag size={13} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />Recent Transactions</> : <><Boxes size={13} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />Stock Tracker</>}
          </button>
        ))}
      </div>

      {/* ── ORDERS SECTION */}
      {activeSection === "orders" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#a8a29e", pointerEvents: "none" }} />
              <input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)}
                className="admin-input" style={{ paddingLeft: 36 }}
                placeholder="Search by order #, customer, or product name..." />
            </div>
            <span style={{ fontSize: "0.75rem", color: "#78716c", whiteSpace: "nowrap" }}>
              {ordersLoading ? "Loading..." : `${filteredOrders.length} order${filteredOrders.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          {ordersLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0", color: "#a8a29e" }}>
              <Loader2 size={28} className="animate-spin" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem 0", color: "#a8a29e" }}>
              <Package size={36} style={{ margin: "0 auto 12px", opacity: 0.35 }} />
              <p style={{ fontSize: "0.875rem" }}>{orderSearch ? `No orders match "${orderSearch}"` : "No orders in this date range"}</p>
              {orderSearch && <button onClick={() => setOrderSearch("")} style={{ fontSize: "0.75rem", marginTop: 8, background: "none", border: "1px solid #e7e5e4", borderRadius: 6, padding: "4px 12px", cursor: "pointer", color: "#78716c" }}>Clear search</button>}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {ordersByDay.map((group) => (
                <div key={group.date}>
                  {/* Day divider */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.625rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f5f5f4", border: "1px solid #e7e5e4", borderRadius: 8, padding: "3px 10px" }}>
                      <Calendar size={12} style={{ color: "#78716c" }} />
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#57534e", textTransform: "uppercase", letterSpacing: "0.08em" }}>{group.label}</span>
                    </div>
                    <span style={{ fontSize: "0.68rem", color: "#a8a29e" }}>{group.orders.length} transaction{group.orders.length !== 1 ? "s" : ""}</span>
                    <div style={{ flex: 1, height: 1, background: "#f5f5f4" }} />
                  </div>

                  {/* Orders for this day */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {group.orders.map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STOCK TRACKER SECTION */}
      {activeSection === "stock" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#a8a29e", pointerEvents: "none" }} />
            <input value={stockSearch} onChange={(e) => setStockSearch(e.target.value)}
              className="admin-input" style={{ paddingLeft: 36 }}
              placeholder="Search products..." />
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0", color: "#a8a29e" }}>
              <Loader2 size={28} className="animate-spin" />
            </div>
          ) : filteredStock.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem 0", color: "#a8a29e" }}>
              <Package size={36} style={{ margin: "0 auto 12px", opacity: 0.35 }} />
              <p style={{ fontSize: "0.875rem" }}>No products found</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {/* Header row */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "0.5rem", padding: "0.375rem 1rem", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a8a29e" }}>
                <span>Product</span><span style={{ textAlign: "center" }}>Units Sold</span><span style={{ textAlign: "center" }}>Total Stock</span><span style={{ textAlign: "center" }}>Reserved</span><span style={{ textAlign: "center" }}>Available</span>
              </div>

              {filteredStock.map((product) => {
                const variants = product.variants ?? [];
                const totalQty = variants.reduce((s, v) => s + (v.inventory?.quantity ?? 0), 0);
                const totalReserved = variants.reduce((s, v) => s + (v.inventory?.reservedQuantity ?? 0), 0);
                const available = totalQty - totalReserved;
                const unitsSold = unitsSoldMap.get(product.id) ?? 0;
                const isLow = available <= 10 && variants.length > 0;
                const isOut = available <= 0 && variants.length > 0;

                return (
                  <div
                    key={product.id}
                    style={{ background: "white", border: `1px solid ${isOut ? "#fecaca" : isLow ? "#fed7aa" : "#e7e5e4"}`, borderRadius: 10, padding: "0.75rem 1rem", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "0.5rem", alignItems: "center" }}
                  >
                    {/* Product info */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", minWidth: 0 }}>
                      {product.images?.[0] ? (
                        <img src={product.images[0].url} alt={product.name} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, border: "1px solid #e7e5e4", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: 6, background: "#f5f5f4", border: "1px solid #e7e5e4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Package size={14} style={{ color: "#d6d3d1" }} />
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1c1917", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.name}</p>
                        <p style={{ fontSize: "0.68rem", color: "#78716c", margin: 0 }}>{fmt(product.sellingPrice)} · {variants.length} variant{variants.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>

                    {/* Units sold */}
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: unitsSold > 0 ? "#15803d" : "#a8a29e", background: unitsSold > 0 ? "#f0fdf4" : "#fafaf9", border: `1px solid ${unitsSold > 0 ? "#bbf7d0" : "#e7e5e4"}`, borderRadius: 999, padding: "2px 10px" }}>
                        {unitsSold > 0 ? `\u2191${unitsSold}` : "—"}
                      </span>
                    </div>

                    {/* Total */}
                    <div style={{ textAlign: "center", fontSize: "0.85rem", fontWeight: 600, color: "#44403c" }}>{totalQty}</div>

                    {/* Reserved */}
                    <div style={{ textAlign: "center", fontSize: "0.82rem", color: totalReserved > 0 ? "#c2410c" : "#a8a29e" }}>{totalReserved > 0 ? totalReserved : "—"}</div>

                    {/* Available */}
                    <div style={{ textAlign: "center" }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 800, color: isOut ? "#dc2626" : isLow ? "#c2410c" : "#15803d", background: isOut ? "#fef2f2" : isLow ? "#fff7ed" : "#f0fdf4", border: `1px solid ${isOut ? "#fecaca" : isLow ? "#fed7aa" : "#bbf7d0"}`, borderRadius: 999, padding: "2px 10px" }}>
                        {variants.length === 0 ? "N/A" : available}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}






function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";

  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}
// ─── Tab: Orders Management ────────────────────────────────────────────────────

function OrdersManagementTab({ onToast }: { onToast: (msg: string, type: "success" | "error") => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem("unchanged_token");
      const res = await fetch(`${API}/admin/orders?sortBy=newest&limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch orders");
      const json = await res.json();
      setOrders(json.data?.data || json.data || []);
    } catch (err: any) {
      onToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleRowClick = async (id: string) => {
    setSelectedOrderId(id);
    setLoadingDetail(true);
    try {
      const token = localStorage.getItem("unchanged_token");
      const res = await fetch(`${API}/admin/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch order details");
      const json = await res.json();
      setOrderDetail(json.data || json);
    } catch (err: any) {
      onToast(err.message, "error");
      setSelectedOrderId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!orderDetail) return;

    // Safety check for DELIVERED
    if (newStatus === "delivered" && !window.confirm("Are you sure you want to mark this order as Delivered? This will permanently deduct inventory and cannot be undone.")) {
      return;
    }

    setUpdatingStatus(true);
    try {
      const token = localStorage.getItem("unchanged_token");
      const res = await fetch(`${API}/admin/orders/${orderDetail.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update status");
      }
      onToast(`Order marked as ${newStatus.toUpperCase()}`, "success");

      // Update local state
      setOrderDetail(prev => prev ? { ...prev, status: newStatus } : null);
      setOrders(prev => prev.map(o => o.id === orderDetail.id ? { ...o, status: newStatus } : o));
    } catch (err: any) {
      onToast(err.message, "error");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'shipped': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'returned': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'refunded': return 'bg-stone-200 text-stone-800 border-stone-300';
      default: return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin text-stone-400" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-serif font-bold uppercase tracking-tight">Orders</h2>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-stone-200">
          <Package className="mx-auto text-stone-300 mb-4" size={48} />
          <p className="text-stone-500 font-medium">No orders found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[10px] font-bold border-b border-stone-200">
              <tr>
                <th className="px-6 py-4">Order Number</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {orders.map((o) => (
                <tr key={o.id} onClick={() => handleRowClick(o.id)} className="hover:bg-stone-50 cursor-pointer transition-colors">
                  <td className="px-6 py-4 font-mono font-medium">{o.orderNumber}</td>
                  <td className="px-6 py-4 text-stone-500">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-4">{o.user?.email || o.userId.slice(0, 8) + '...'}</td>
                  <td className="px-6 py-4 font-bold">₹{o.totalAmount}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(o.status)}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setSelectedOrderId(null)}>
          <div className="bg-[#f9f7f4] max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-stone-200 bg-white sticky top-0 z-10 rounded-t-xl">
              <h3 className="text-xl font-serif font-bold uppercase">Order Details</h3>
              <button onClick={() => setSelectedOrderId(null)} className="text-stone-400 hover:text-black transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-8">
              {loadingDetail || !orderDetail ? (
                <div className="flex justify-center p-20">
                  <Loader2 className="animate-spin text-stone-400" size={32} />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer & Shipping */}
                    <div className="admin-card">
                      <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4 border-b border-stone-100 pb-2">Customer & Shipping</h4>
                      <p className="text-sm font-medium mb-1">{orderDetail.user?.firstName} {orderDetail.user?.lastName}</p>
                      <p className="text-sm text-stone-500 mb-4">{orderDetail.user?.email}</p>

                      <div className="text-sm text-stone-600 leading-relaxed bg-stone-50 p-4 rounded-lg border border-stone-100">
                        {orderDetail.shippingAddress?.addressLine1}<br />
                        {orderDetail.shippingAddress?.addressLine2 && <>{orderDetail.shippingAddress.addressLine2}<br /></>}
                        {orderDetail.shippingAddress?.city}, {orderDetail.shippingAddress?.state} {orderDetail.shippingAddress?.pincode}
                      </div>
                    </div>

                    {/* Status & Transitions */}
                    <div className="admin-card">
                      <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4 border-b border-stone-100 pb-2">Order Lifecycle</h4>
                      <div className="mb-6 flex items-center gap-3">
                        <span className="text-sm font-semibold">Current Status:</span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(orderDetail.status)}`}>
                          {orderDetail.status}
                        </span>
                      </div>

                      {/* State Machine Buttons */}
                      <div className="flex flex-col gap-2">
                        {orderDetail.status === 'pending' && (
                          <button onClick={() => handleStatusUpdate('confirmed')} disabled={updatingStatus} className="admin-btn-primary w-full">Mark as Confirmed</button>
                        )}
                        {orderDetail.status === 'confirmed' && (
                          <button onClick={() => handleStatusUpdate('processing')} disabled={updatingStatus} className="admin-btn-primary w-full bg-blue-600 hover:bg-blue-700">Begin Processing</button>
                        )}
                        {orderDetail.status === 'processing' && (
                          <button onClick={() => handleStatusUpdate('shipped')} disabled={updatingStatus} className="admin-btn-primary w-full bg-indigo-600 hover:bg-indigo-700">Mark as Shipped</button>
                        )}
                        {orderDetail.status === 'shipped' && (
                          <button onClick={() => handleStatusUpdate('delivered')} disabled={updatingStatus} className="admin-btn-primary w-full bg-emerald-600 hover:bg-emerald-700">Confirm Delivery</button>
                        )}
                        {orderDetail.status === 'delivered' && (
                          <button onClick={() => handleStatusUpdate('returned')} disabled={updatingStatus} className="admin-btn-secondary w-full border-orange-300 text-orange-700 hover:bg-orange-50">Process Return</button>
                        )}
                        {orderDetail.status === 'returned' && (
                          <button onClick={() => handleStatusUpdate('refunded')} disabled={updatingStatus} className="admin-btn-primary w-full bg-stone-600">Issue Refund</button>
                        )}

                        {/* Cancel button available before shipped */}
                        {['pending', 'confirmed', 'processing'].includes(orderDetail.status) && (
                          <button onClick={() => handleStatusUpdate('cancelled')} disabled={updatingStatus} className="mt-4 text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wider text-center w-full py-2">
                            Cancel Order
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="admin-card">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4 border-b border-stone-100 pb-2">Purchased Items ({orderDetail.items?.length || 0})</h4>
                    <div className="flex flex-col gap-4">
                      {orderDetail.items?.map(item => (
                        <div key={item.id} className="flex items-center gap-4 py-2">
                          <div className="w-16 h-20 bg-stone-100 rounded-lg overflow-hidden border border-stone-200 shrink-0">
                            {item.productSnapshot?.imageUrl ? (
                              <img src={item.productSnapshot.imageUrl} alt="product" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-300"><ImageIcon size={20} /></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-sm leading-tight mb-1">{item.productSnapshot?.name || 'Unknown Product'}</p>
                            <p className="text-xs text-stone-500 font-mono">SKU: {item.productSnapshot?.sku || 'N/A'} • Size: {item.productSnapshot?.size || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">₹{item.unitPrice} × {item.quantity}</p>
                            <p className="text-xs text-stone-500 font-medium">Total: ₹{item.totalPrice}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-stone-100 flex justify-between items-center text-lg">
                      <span className="font-medium text-stone-500">Order Total</span>
                      <span className="font-serif font-bold text-2xl">₹{orderDetail.totalAmount}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Page ─────────────────────────────────────────────────────────

type Tab = "add" | "stock" | "edit" | "orders" | "dashboard";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "add", label: "Add Product", icon: <Plus size={16} /> },
  { id: "stock", label: "Manage Stock", icon: <Boxes size={16} /> },
  { id: "edit", label: "Edit Products", icon: <Edit3 size={16} /> },
  { id: "orders", label: "Orders", icon: <Package size={16} /> },
  { id: "dashboard", label: "Sales Dashboard", icon: <BarChart2 size={16} /> },
];

// ─── Admin auth gate ─────────────────────────────────────────────────────────

function AdminGoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
      <path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" fill="#FFC107" />
      <path d="M6.306,14.691l6.571,4.819C14.655,15.108,19.000,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" fill="#FF3D00" />
      <path d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" fill="#4CAF50" />
      <path d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" fill="#1976D2" />
    </svg>
  );
}

function adminInitiateGoogleLogin() {
  const base = (import.meta.env.VITE_BACKEND_URL as string).replace(/\/api\/v1$/, "");
  window.location.href = `${base}/api/v1/auth/google`;
}

type AuthState = "checking" | "unauthenticated" | "unauthorized" | "authorized";

function useAdminAuth(): AuthState {
  const [state, setState] = useState<AuthState>("checking");

  useEffect(() => {
    const token = localStorage.getItem("unchanged_token");
    if (!token) { setState("unauthenticated"); return; }

    fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then((res) => {
        const user = res.data?.user || res.user;
        const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
        setState(isAdmin ? "authorized" : "unauthorized");
      })
      .catch(() => {
        localStorage.removeItem("unchanged_token");
        localStorage.removeItem("unchanged_user");
        setState("unauthenticated");
      });
  }, []);

  return state;
}

export default function AdminPage() {
  const authState = useAdminAuth();
  const [activeTab, setActiveTab] = useState<Tab>("add");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleToast = useCallback((msg: string, type: "success" | "error") => {
    setToast({ msg, type });
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      const errMessage = json.message || json.data?.message || "Invalid credentials";
      if (!res.ok) throw new Error(errMessage);

      // The backend wraps responses in { success: true, data: ... }
      const payload = json.success && json.data ? json.data : json;

      localStorage.setItem("unchanged_token", payload.accessToken);
      localStorage.setItem("unchanged_user", JSON.stringify(payload.user));
      window.location.reload();
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ── Auth gate screens ────────────────────────────────────────────────────
  if (authState === "checking") {
    return (
      <div className="min-h-screen bg-[#f9f7f4] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-stone-400" />
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#f9f7f4] flex items-center justify-center px-4 font-sans">
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-10 max-w-sm w-full text-center flex flex-col items-center gap-6">
          <div className="w-14 h-14 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center">
            <Package size={26} className="text-stone-600" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold mb-1">Admin Portal</h1>
            <p className="text-sm text-stone-500">Sign in with an authorised admin account to continue.</p>
          </div>
          <div className="w-full">
            <button
              onClick={adminInitiateGoogleLogin}
              className="w-full flex items-center justify-center gap-3 border border-stone-300 py-3 px-4 text-sm font-semibold hover:bg-stone-50 transition-colors rounded-lg mb-4"
            >
              <AdminGoogleIcon />
              Continue with Google
            </button>
            <div className="relative flex items-center py-2 mb-4">
              <div className="flex-grow border-t border-stone-200"></div>
              <span className="flex-shrink-0 mx-4 text-stone-400 text-xs uppercase tracking-wide">Or sign in with</span>
              <div className="flex-grow border-t border-stone-200"></div>
            </div>
            <form onSubmit={handlePasswordLogin} className="flex flex-col gap-3 text-left">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                  placeholder="••••••••"
                />
              </div>
              {loginError && <p className="text-red-500 text-xs mt-1">{loginError}</p>}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-stone-900 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50 mt-2"
              >
                {isLoggingIn ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (authState === "unauthorized") {
    return (
      <div className="min-h-screen bg-[#f9f7f4] flex items-center justify-center px-4 font-sans">
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-10 max-w-sm w-full text-center flex flex-col items-center gap-6">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
            <AlertTriangle size={26} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold mb-1">Access Denied</h1>
            <p className="text-sm text-stone-500">Your account does not have admin privileges.</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("unchanged_token");
              localStorage.removeItem("unchanged_user");
              window.location.reload();
            }}
            className="text-sm text-stone-500 hover:text-black underline transition-colors"
          >
            Sign out and try a different account
          </button>
        </div>
      </div>
    );
  }

  // authState === "authorized" — render the actual admin panel below

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
        <div className="w-full mx-auto flex flex-col gap-8">
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
          {activeTab === "orders" && <OrdersManagementTab onToast={handleToast} />}
          {activeTab === "dashboard" && <SalesDashboardTab onToast={handleToast} />}
        </div>
      </div>

      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  );
}
