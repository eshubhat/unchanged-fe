import { useEffect, lazy, Suspense } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { setLenis } from "./utils/lenis";
import { initAuth } from "./utils/api";

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
  useEffect(() => {
    // Silently restore auth session on hard refresh
    initAuth();
  }, []);

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
          </Routes>
        </Suspense>
        <Footer />
      </main>
    </BrowserRouter>
  );
}