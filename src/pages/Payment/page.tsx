import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { initiatePayment, verifyPayment } from "../../utils/api";
import { ShieldCheck, Loader2 } from "lucide-react";

// ── Razorpay global type declaration ─────────────────────────────────────────
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentPage() {
  const navigate = useNavigate();

  const [orderId] = useState<string | null>(() =>
    sessionStorage.getItem("pending_order_id")
  );
  const [orderAmount] = useState<number>(() =>
    Number(sessionStorage.getItem("pending_order_amount") ?? 0)
  );

  const [status, setStatus] = useState<
    "idle" | "loading" | "verifying" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Redirect if no order is pending
  useEffect(() => {
    if (!orderId) navigate("/cart");
  }, [orderId, navigate]);

  const handlePayment = async () => {
    if (!orderId) return;
    setStatus("loading");
    setErrorMsg(null);

    try {
      // 1. Load Razorpay SDK
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load Razorpay SDK. Check your connection.");

      // 2. Create Razorpay order via our backend
      const paymentData = await initiatePayment(orderId);

      // 3. Open Razorpay checkout modal
      await new Promise<void>((resolve, reject) => {
        const options = {
          key: paymentData.key,
          amount: paymentData.amount,
          currency: paymentData.currency,
          order_id: paymentData.razorpayOrderId,
          name: "Unchanged",
          description: "Order Payment",
          image: "/logo.svg",
          theme: { color: "#000000" },

          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              setStatus("verifying");

              // 4. Verify signature with our backend
              await verifyPayment({
                orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });

              // 5. Clear cart + session, navigate to success
              localStorage.removeItem("unchanged_cart");
              sessionStorage.removeItem("pending_order_id");
              sessionStorage.removeItem("pending_order_amount");
              window.dispatchEvent(new Event("cartUpdated"));

              resolve();
              navigate("/success");
            } catch (err: unknown) {
              reject(err);
            }
          },

          modal: {
            ondismiss: () => {
              reject(new Error("Payment was cancelled."));
            },
          },
        };

        const rzp = new window.Razorpay(options);

        rzp.on(
          "payment.failed",
          (response: { error: { description: string } }) => {
            reject(new Error(response.error?.description ?? "Payment failed"));
          }
        );

        rzp.open();
      });
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      if (status !== "verifying") setStatus("idle");
    }
  };

  const isProcessing = status === "loading" || status === "verifying";

  return (
    <div className="min-h-screen bg-[#fcf9f0] pt-32 pb-16 px-6 flex items-center justify-center font-sans text-stone-900">
      <div className="bg-white border border-stone-200 p-8 max-w-lg w-full shadow-sm text-center">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-full bg-stone-50 border border-stone-200 flex items-center justify-center">
            <ShieldCheck size={28} className="text-stone-700" />
          </div>
          <h1 className="text-2xl font-serif font-medium">Secure Checkout</h1>
          <p className="text-stone-500 text-sm">
            Powered by Razorpay — UPI, Cards, Net Banking & more
          </p>
        </div>

        {/* Order total */}
        <div className="bg-stone-50 p-4 mb-8 text-left border border-stone-100 rounded-sm">
          <div className="flex justify-between font-bold text-lg">
            <span>Total Payable:</span>
            <span>₹{orderAmount.toLocaleString("en-IN")}</span>
          </div>
          {orderId && (
            <p className="text-xs text-stone-400 mt-1">
              Order ID: {orderId.slice(0, 8)}…
            </p>
          )}
        </div>

        {/* Error */}
        {status === "error" && errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-6 text-sm text-left">
            {errorMsg}
          </div>
        )}

        {/* Pay button */}
        <button
          id="razorpay-pay-btn"
          onClick={handlePayment}
          disabled={isProcessing || !orderId}
          className="w-full py-4 text-white font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 bg-[#3395FF] hover:bg-[#2081ea] disabled:bg-stone-400 disabled:cursor-not-allowed"
        >
          {isProcessing && <Loader2 size={18} className="animate-spin" />}
          {status === "loading" && "Opening Razorpay…"}
          {status === "verifying" && "Verifying Payment…"}
          {(status === "idle" || status === "error") && "Pay Now with Razorpay"}
        </button>

        <p className="text-xs text-stone-400 mt-4">
          Your payment is secured with 256-bit SSL encryption.
        </p>
      </div>
    </div>
  );
}
