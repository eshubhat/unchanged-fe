import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getCart } from "../../utils/cart";
import {
  registerUser,
  loginUser,
  createOrder,
  getMe,
  getAddresses,
  initiateGoogleLogin,
  type UserInfo,
  type SavedAddress,
} from "../../utils/api";
import AddressManager from "../../components/AddressManager/AddressManager";
import { ArrowLeft, Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";

// ─── Google Icon ──────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
      <path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" fill="#FFC107" />
      <path d="M6.306,14.691l6.571,4.819C14.655,15.108,19.000,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" fill="#FF3D00" />
      <path d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" fill="#4CAF50" />
      <path d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" fill="#1976D2" />
    </svg>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({
  label, name, type = "text", value, onChange, required = true, placeholder,
}: {
  label: string; name: string; type?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase tracking-wider text-stone-500 font-semibold">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        required={required}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? label}
        className="border border-stone-300 px-3 py-2.5 w-full focus:outline-none focus:border-black transition-colors text-sm bg-white"
      />
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${done ? "bg-black text-white" : active ? "bg-black text-white" : "bg-stone-200 text-stone-500"
        }`}>
        {done ? <CheckCircle2 size={14} /> : n}
      </div>
      <span className={`text-xs uppercase tracking-wider font-semibold ${active ? "text-stone-900" : "text-stone-400"}`}>
        {label}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const navigate = useNavigate();
  const cartItems = getCart();

  // ── Auth state ────────────────────────────────────────────────────────────
  const [loggedInUser, setLoggedInUser] = useState<UserInfo | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Auth form fields ──────────────────────────────────────────────────────
  const [auth, setAuth] = useState({
    email: "", password: "", firstName: "", lastName: "", phone: "",
  });

  // ── Registration address fields ───────────────────────────────────────────
  const [regAddr, setRegAddr] = useState({
    addressLine1: "", city: "", state: "", pincode: "",
  });

  // ── Saved addresses (shown when logged in) ────────────────────────────────
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  const parsePrice = (p: string) => parseInt(p.replace(/[^0-9.]/g, "")) || 0;
  const subtotal = cartItems.reduce((a, i) => a + parsePrice(i.price) * i.quantity, 0);

  // ── Check if already logged in ────────────────────────────────────────────
  useEffect(() => {
    if (cartItems.length === 0) { navigate("/"); return; }

    const token = localStorage.getItem("unchanged_token");
    if (!token) { setCheckingAuth(false); return; }

    // Try to restore from localStorage cache first (from Google callback)
    const cached = localStorage.getItem("unchanged_user");
    if (cached) {
      try {
        const user = JSON.parse(cached) as UserInfo;
        setLoggedInUser(user);
        fetchAddresses();
        setCheckingAuth(false);
        return;
      } catch (_) { }
    }

    // Otherwise verify token with backend
    getMe()
      .then(({ user }) => {
        setLoggedInUser(user);
        fetchAddresses();
      })
      .catch(() => {
        localStorage.removeItem("unchanged_token");
        localStorage.removeItem("unchanged_user");
        localStorage.removeItem("unchanged_has_address");
      })
      .finally(() => setCheckingAuth(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const { addresses } = await getAddresses();
      setSavedAddresses(addresses);
      // Pre-select default or first
      const def = addresses.find((a) => a.isDefault) ?? addresses[0];
      if (def) setSelectedAddressId(def.id);
    } catch (_) {
      // silently ignore — user will be prompted to add one
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleAuthChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setAuth((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleRegAddrChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setRegAddr((p) => ({ ...p, [e.target.name]: e.target.value }));

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // ── Phase A: Login ──────────────────────────────────────────────────
      // Just authenticate, update state, fetch addresses — then stop so the
      // user can see and select their saved address before placing the order.
      if (!loggedInUser && isLogin) {
        const tokens = await loginUser({ email: auth.email, password: auth.password });
        localStorage.setItem("unchanged_token", tokens.accessToken ?? "");
        const userObj = tokens.user ?? null;
        if (userObj) {
          localStorage.setItem("unchanged_user", JSON.stringify(userObj));
          setLoggedInUser(userObj);
        }
        // Load their saved addresses into the address manager
        await fetchAddresses();
        // Stop here — the page will now show the address section
        // and the user clicks "Continue to Payment" to create the order
        setLoading(false);
        return;
      }

      // ── Phase B: Register with embedded address → straight to payment ───
      if (!loggedInUser && !isLogin) {
        if (!regAddr.addressLine1 || !regAddr.city || !regAddr.state || !regAddr.pincode) {
          throw new Error("Please fill in all required address fields.");
        }
        const tokens = await registerUser({
          email: auth.email,
          password: auth.password,
          firstName: auth.firstName,
          lastName: auth.lastName || undefined,
          phone: auth.phone || undefined,
          address: {
            addressLine1: regAddr.addressLine1,
            city: regAddr.city,
            state: regAddr.state,
            pincode: regAddr.pincode,
          },
        });
        localStorage.setItem("unchanged_token", tokens.accessToken ?? "");
        const userObj = tokens.user ?? null;
        if (userObj) {
          localStorage.setItem("unchanged_user", JSON.stringify(userObj));
          setLoggedInUser(userObj);
        }
        // Get the address that was just created at registration
        const { addresses } = await getAddresses();
        const def = addresses.find((a) => a.isDefault) ?? addresses[0];
        if (!def) throw new Error("Something went wrong saving your address. Please try again.");

        const order = await createOrder({
          addressId: def.id,
          items: cartItems.map((c) => ({ variantId: String(c.id), quantity: c.quantity })),
        });
        sessionStorage.setItem("pending_order_id", order.id);
        sessionStorage.setItem("pending_order_amount", String(order.totalAmount));
        navigate("/payment");
        return;
      }

      // ── Phase C: Already logged in → create order with selected address ─
      if (!selectedAddressId) {
        throw new Error("Please select or add a shipping address to continue.");
      }
      const order = await createOrder({
        addressId: selectedAddressId,
        items: cartItems.map((c) => ({ variantId: String(c.id), quantity: c.quantity })),
      });
      sessionStorage.setItem("pending_order_id", order.id);
      sessionStorage.setItem("pending_order_amount", String(order.totalAmount));
      navigate("/payment");

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  // ── Loading screen ────────────────────────────────────────────────────────
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#fcf9f0] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-stone-400" />
      </div>
    );
  }

  const isLoggedIn = !!loggedInUser;
  const hasAddresses = savedAddresses?.length > 0;

  const orderSummaryMarkup = (
    <div className="bg-white border border-stone-200 p-6 sticky top-28 rounded-sm">
      <h2 className="text-xl font-serif font-medium mb-6">Order Summary</h2>
      <div className="flex flex-col gap-4 mb-6">
        {cartItems.map((item) => (
          <div key={item.id} className="flex items-start gap-3">
            <div className="w-12 h-14 bg-stone-100 flex-shrink-0 overflow-hidden">
              <img src={item.imageFront} alt={item.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-xs text-stone-500">Qty: {item.quantity}</p>
            </div>
            <span className="text-sm font-bold whitespace-nowrap">
              ₹{parsePrice(item.price) * item.quantity}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-stone-200 my-4" />
      <div className="flex justify-between font-bold text-lg">
        <span>Total</span>
        <span>₹{subtotal.toLocaleString("en-IN")}</span>
      </div>

      {/* ── Saved addresses quick summary ─── */}
      {isLoggedIn && hasAddresses && selectedAddressId && (() => {
        const sel = savedAddresses.find(a => a.id === selectedAddressId);
        if (!sel) return null;
        return (
          <div className="mt-4 pt-4 border-t border-stone-100">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-1">Delivering to</p>
            <p className="text-xs font-semibold text-stone-700">{sel.fullName}</p>
            <p className="text-xs text-stone-500 leading-relaxed">
              {sel.addressLine1}, {sel.city}, {sel.state} {sel.pincode}
            </p>
          </div>
        );
      })()}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcf9f0] pt-32 pb-16 px-6 md:px-12 font-sans text-stone-900">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-16">

        {/* ── Left: Form ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 flex-1">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link to="/cart" className="text-stone-400 hover:text-black transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-3xl font-serif font-medium">Checkout</h1>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-4 mb-8">
            <Step n={1} label="Account" active={!isLoggedIn} done={isLoggedIn} />
            <div className="flex-1 h-px bg-stone-200" />
            <Step n={2} label="Shipping" active={isLoggedIn} done={false} />
            <div className="flex-1 h-px bg-stone-200" />
            <Step n={3} label="Payment" active={false} done={false} />
          </div>

          {/* Mobile Order Summary (Between steps and form) */}
          <div className="block md:hidden mb-2">
            {orderSummaryMarkup}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-6 text-sm rounded-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-10">

            {/* ── Auth Section ──────────────────────────────────────────── */}
            {!isLoggedIn ? (
              <div className="flex flex-col gap-4 bg-white border border-stone-200 p-6 rounded-sm">
                <div className="flex items-center justify-between mb-5 gap-4">
                  <h2 className="font-bold uppercase tracking-wider text-xs text-stone-500">
                    {isLogin ? "Login to Your Account" : "Create an Account"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-xs text-[#3395FF] hover:underline"
                  >
                    {isLogin ? "New here? Register" : "Have an account? Login"}
                  </button>
                </div>

                {/* Google Sign-In */}
                <button
                  type="button"
                  onClick={initiateGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 border border-stone-300 py-2.5 px-4 text-sm font-medium hover:bg-stone-50 transition-colors mb-5 rounded-sm"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-stone-200" />
                  <span className="text-xs text-stone-400 uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-stone-200" />
                </div>

                <div className="flex flex-col gap-4">
                  {!isLogin && (
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="First Name" name="firstName" value={auth.firstName} onChange={handleAuthChange} />
                      <Field label="Last Name" name="lastName" value={auth.lastName} onChange={handleAuthChange} required={false} />
                    </div>
                  )}
                  <Field label="Email" name="email" type="email" value={auth.email} onChange={handleAuthChange} />
                  <Field label="Password" name="password" type="password" value={auth.password} onChange={handleAuthChange} />
                  {!isLogin && (
                    <Field label="Phone" name="phone" type="tel" value={auth.phone} onChange={handleAuthChange} required={false} placeholder="+91 00000 00000" />
                  )}
                </div>

                {/* ── Registration address fields ─────────────────────── */}
                {!isLogin && (
                  <div className="flex flex-col gap-4 mt-6 pt-5 border-t border-stone-100">
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-4 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px]">📍</span>
                      Shipping Address
                      <span className="text-stone-400 font-normal normal-case tracking-normal">— saved to your account</span>
                    </p>
                    <div className="flex flex-col gap-3">
                      <Field
                        label="Address"
                        name="addressLine1"
                        value={regAddr.addressLine1}
                        onChange={handleRegAddrChange}
                        placeholder="House no, building, street, area"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="City" name="city" value={regAddr.city} onChange={handleRegAddrChange} />
                        <Field label="State" name="state" value={regAddr.state} onChange={handleRegAddrChange} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="PIN Code" name="pincode" value={regAddr.pincode} onChange={handleRegAddrChange} placeholder="560034" />
                      </div>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-3 flex items-center gap-1">
                      <ShieldCheck size={12} className="text-stone-400" />
                      Saved securely. You can add more addresses after signing up.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* ── Logged-in user card (Profile Section) ──────────────────────────────────── */
              <div className="bg-white border border-stone-200 p-8 flex flex-col items-center text-center gap-6 rounded-sm">
                {loggedInUser.avatarUrl ? (
                  <img src={loggedInUser.avatarUrl} alt="" className="w-16 h-16 shrink-0 rounded-full object-cover border-[3px] border-stone-100 shadow-sm" style={{ width: 64, height: 64 }} />
                ) : (
                  <div className="w-16 h-16 shrink-0 rounded-full bg-stone-100 border-[3px] border-white shadow-sm flex items-center justify-center text-stone-800 font-bold text-2xl" style={{ width: 64, height: 64 }}>
                    {loggedInUser.firstName?.[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <p className="text-xl font-bold">{loggedInUser.firstName} {loggedInUser.lastName ?? ""}</p>
                  <p className="text-sm text-stone-500">{loggedInUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("unchanged_token");
                    localStorage.removeItem("unchanged_user");
                    localStorage.removeItem("unchanged_has_address");
                    setLoggedInUser(null);
                    setSavedAddresses([]);
                    setSelectedAddressId(null);
                  }}
                  className="mt-2 text-sm font-semibold border border-stone-300 text-stone-600 hover:border-red-500 hover:text-red-500 hover:bg-red-50 transition-colors px-6 py-2 rounded-sm"
                >
                  Sign Out
                </button>
              </div>
            )}

            {/* ── Shipping Address Section (logged-in users) ─────────────── */}
            {isLoggedIn && (
              <div className="flex flex-col gap-4 bg-white border border-stone-200 p-6 rounded-sm">
                <h2 className="font-bold uppercase tracking-wider text-xs text-stone-500 mb-5">
                  Shipping Address
                </h2>

                {loadingAddresses ? (
                  <div className="flex items-center gap-2 text-stone-400 text-sm py-4">
                    <Loader2 size={16} className="animate-spin" />
                    Loading your saved addresses…
                  </div>
                ) : (
                  <AddressManager
                    addresses={savedAddresses}
                    selectedId={selectedAddressId}
                    onSelect={setSelectedAddressId}
                    onListChange={(updated) => {
                      setSavedAddresses(updated);
                      if (!selectedAddressId && updated?.length > 0) {
                        const def = updated.find((a) => a.isDefault) ?? updated[0];
                        setSelectedAddressId(def.id);
                      }
                    }}
                  />
                )}
              </div>
            )}

            {/* ── Trust badge ───────────────────────────────────────────── */}
            <div className="bg-white border border-stone-200 p-4 flex items-center gap-3 rounded-sm">
              <ShieldCheck size={18} className="text-stone-400 flex-shrink-0" />
              <p className="text-xs text-stone-500">
                Your details are securely stored with your order.
              </p>
            </div>

            {/* ── Submit ────────────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={loading || (isLoggedIn && !loadingAddresses && !selectedAddressId && savedAddresses?.length === 0)}
              className="w-full bg-black text-white py-4 uppercase tracking-wider font-bold hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded-sm"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading
                ? (isLoggedIn ? "Creating your order…" : isLogin ? "Logging in…" : "Creating account…")
                : (isLoggedIn ? "Continue to Payment" : isLogin ? "Login & View Addresses" : "Create Account & Continue")
              }
            </button>
          </form>
        </div>

        {/* ── Right: Order Summary ─────────────────────────────────────────── */}
        <div className="w-full md:w-80 flex-shrink-0 hidden md:block">
          {orderSummaryMarkup}
        </div>

      </div>
    </div>
  );
}
