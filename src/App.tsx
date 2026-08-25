import { useEffect, useCallback, lazy, Suspense, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { setLenis } from "./utils/lenis";
import { initAuth, getTokenExpiryMs } from "./utils/api";

import Navbar from "./components/Navbar/page";
const Landing = lazy(() => import("./pages/Landing/page"));
const CartPage = lazy(() => import("./pages/Cart/page"));
const CheckoutPage = lazy(() => import("./pages/Checkout/page"));
const PaymentPage = lazy(() => import("./pages/Payment/page"));
const SuccessPage = lazy(() => import("./pages/Success/page"));
const AdminPage = lazy(() => import("./pages/Admin/page"));
const AuthCallbackPage = lazy(() => import("./pages/AuthCallback/page"));
const OrdersPage = lazy(() => import("./pages/Orders/page"));
const ProfilePage = lazy(() => import("./pages/Profile/page"));
const FAQPage = lazy(() => import("./pages/FAQ/page"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicy/page"));
const ReviewsPage = lazy(() => import("./pages/Reviews/page"));
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import "./App.css";

// Component to ensure page scrolls to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
import Footer from "./components/Footer/page";

// Register ScrollTrigger globally so Lenis can sync with it
gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const proactiveRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Schedule a proactive token refresh ──────────────────────────────────
  // Fires when 90% of the token's lifetime has elapsed (i.e. with 10% left).
  // This keeps the session alive without refreshing too eagerly.
  const scheduleProactiveRefresh = useCallback(() => {
    if (proactiveRefreshTimer.current) {
      clearTimeout(proactiveRefreshTimer.current);
      proactiveRefreshTimer.current = null;
    }
    const msLeft = getTokenExpiryMs();
    if (msLeft <= 0) return; // No token / already expired — nothing to schedule

    // Fire when 90% of the token's life has been consumed.
    // Clamp: minimum 30s (avoid refresh storms), maximum 23h (sanity cap).
    const delay = Math.min(Math.max(msLeft * 0.9, 30_000), 23 * 60 * 60 * 1000);

    proactiveRefreshTimer.current = setTimeout(async () => {
      await initAuth(); // refreshes token silently if needed
      scheduleProactiveRefresh(); // reschedule after refresh
    }, delay);
  }, []); // stable — no deps, reads from localStorage at call time

  useEffect(() => {
    // Let the OAuth callback store the fresh token before any silent refresh can clear auth state.
    if (window.location.pathname !== "/auth/callback") {
      initAuth().then(() => scheduleProactiveRefresh());
    }

    // Re-verify auth whenever the tab becomes visible again (user returns from
    // another tab / phone lock). Without this, idle users get 401s on return.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        initAuth().then(() => scheduleProactiveRefresh());
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleAuthStateChanged = () => scheduleProactiveRefresh();
    window.addEventListener("authStateChanged", handleAuthStateChanged);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("authStateChanged", handleAuthStateChanged);
      if (proactiveRefreshTimer.current) clearTimeout(proactiveRefreshTimer.current);
    };
  }, [scheduleProactiveRefresh]);


  // Global Smooth Scroll Initialization
  useEffect(() => {
    const lenisInstance = new Lenis();

    setLenis(lenisInstance);

    lenisInstance.on("scroll", ScrollTrigger.update);

    const ticker = (time: number) =>
      lenisInstance.raf(time * 1000);

    gsap.ticker.add(ticker);

    return () => {
      gsap.ticker.remove(ticker);
      lenisInstance.destroy();
    };
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <main>
        <Navbar />
        <Suspense fallback={<div className="min-h-screen bg-[#fcf9f0] flex items-center justify-center text-stone-500 text-sm tracking-widest uppercase font-bold">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
          </Routes>
        </Suspense>
        <Footer />
      </main>
    </BrowserRouter>
  );
}
