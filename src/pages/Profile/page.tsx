import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  registerUser,
  loginUser,
  getMe,
  getAddresses,
  initiateGoogleLogin,
  storeAuthTokens,
  type UserInfo,
  type SavedAddress,
} from "../../utils/api";
import AddressManager from "../../components/AddressManager/AddressManager";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";

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

export default function ProfilePage() {
  const [loggedInUser, setLoggedInUser] = useState<UserInfo | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLogin, setIsLogin] = useState(true); // Default to login on this page
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auth fields
  const [auth, setAuth] = useState({
    email: "", password: "", firstName: "", lastName: "", phone: "",
  });

  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("unchanged_token");
    if (!token) { setCheckingAuth(false); return; }

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
  }, []);

  const fetchAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const { addresses } = await getAddresses();
      setSavedAddresses(addresses);
      const def = addresses.find((a) => a.isDefault) ?? addresses[0];
      if (def) setSelectedAddressId(def.id);
    } catch (_) {
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleAuthChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setAuth((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isLogin) {
        const tokens = await loginUser({ email: auth.email, password: auth.password });
        storeAuthTokens(tokens);
        const userObj = tokens.user ?? null;
        if (userObj) setLoggedInUser(userObj);
        await fetchAddresses();
      } else {
        const tokens = await registerUser({
          email: auth.email,
          password: auth.password,
          firstName: auth.firstName,
          lastName: auth.lastName || undefined,
          phone: auth.phone || undefined,
        });
        storeAuthTokens(tokens);
        const userObj = tokens.user ?? null;
        if (userObj) setLoggedInUser(userObj);
        await fetchAddresses();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#fcf9f0] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-stone-400" />
      </div>
    );
  }

  const isLoggedIn = !!loggedInUser;

  return (
    <div className="min-h-screen bg-[#fcf9f0] pt-32 pb-16 px-6 md:px-12 font-sans text-stone-900">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">

        <div className="flex items-center gap-4 mb-2">
          <Link to="/" className="text-stone-400 hover:text-black transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-serif font-medium uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            {isLoggedIn ? "My Profile" : "Account"}
          </h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm rounded-sm">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm rounded-sm">
            {successMsg}
          </div>
        )}

        {!isLoggedIn ? (
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 bg-white border border-stone-200 p-8 rounded-sm">
              <div className="flex items-center justify-between mb-6 gap-4">
                <h2 className="font-bold uppercase tracking-wider text-sm text-stone-700">
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

              <button
                type="button"
                onClick={initiateGoogleLogin}
                className="w-full flex items-center justify-center gap-3 border border-stone-300 py-3 px-4 text-sm font-medium hover:bg-stone-50 transition-colors mb-6 rounded-sm"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-xs text-stone-400 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white py-3 mt-2 uppercase tracking-wider font-bold hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded-sm"
                >
                  {loading && <Loader2 size={18} className="animate-spin" />}
                  {isLogin ? "Login" : "Register"}
                </button>
              </form>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-6 p-8 bg-stone-50 border border-stone-200 rounded-sm">
              <ShieldCheck size={32} className="text-stone-400" />
              <div>
                <h3 className="font-bold text-stone-800 mb-2">Secure & Seamless</h3>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Sign in to save your shipping details, track orders, and experience a faster checkout. Your details are securely encrypted.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-8 md:gap-12">
            <div className="w-full md:w-1/3 flex flex-col gap-6">
              <div className="bg-white border border-stone-200 p-8 flex flex-col items-center text-center gap-6 rounded-sm">
                {loggedInUser.avatarUrl ? (
                  <img src={loggedInUser.avatarUrl} alt="" className="w-16 h-16 shrink-0 rounded-full object-cover border-2 border-stone-100 shadow-sm" style={{ width: 64, height: 64 }} />
                ) : (
                  <div className="w-16 h-16 shrink-0 rounded-full bg-stone-100 border-2 border-white shadow-sm flex items-center justify-center text-stone-800 font-bold text-2xl" style={{ width: 64, height: 64 }}>
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
                    localStorage.removeItem("unchanged_token_expiry");
                    setLoggedInUser(null);
                    setSavedAddresses([]);
                    setSelectedAddressId(null);
                    window.dispatchEvent(new Event("authStateChanged"));
                  }}
                  className="mt-4 w-full text-sm font-semibold border border-stone-300 text-stone-600 hover:border-red-500 hover:text-red-500 hover:bg-red-50 transition-colors px-6 py-2.5 rounded-sm"
                >
                  Sign Out
                </button>
              </div>

              <div className="bg-white border border-stone-200 p-6 rounded-sm flex flex-col gap-3">
                <Link to="/orders" className="flex items-center justify-between group">
                  <span className="font-medium text-stone-700 group-hover:text-black transition-colors">My Orders</span>
                  <span className="text-stone-400 group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
            </div>

            <div className="flex-1 bg-white border border-stone-200 p-8 rounded-sm">
              <h2 className="font-bold uppercase tracking-wider text-sm text-stone-700 mb-6">
                Saved Addresses
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
          </div>
        )}
      </div>
    </div>
  );
}
