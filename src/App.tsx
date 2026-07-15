import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { setLenis } from "./utils/lenis";

import Navbar from "./components/Navbar/page";
import Landing from "./pages/Landing/page";
import CartPage from "./pages/Cart/page";
import CheckoutPage from "./pages/Checkout/page";
import PaymentPage from "./pages/Payment/page";
import SuccessPage from "./pages/Success/page";
import AdminPage from "./pages/Admin/page";
import AuthCallbackPage from "./pages/AuthCallback/page";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./App.css";
import Footer from "./components/Footer/page";

// Register ScrollTrigger globally so Lenis can sync with it
gsap.registerPlugin(ScrollTrigger);

export default function App() {
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
      <main>
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
        <Footer />
      </main>
    </BrowserRouter>
  );
}