import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCart } from "../../utils/cart";

export default function PaymentPage() {
  const navigate = useNavigate();
  const cartItems = getCart();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate("/");
    }
  }, [cartItems, navigate]);

  const handleDummyPayment = () => {
    setProcessing(true);
    // Simulate Razorpay popup delay
    setTimeout(() => {
      setProcessing(false);
      // Clear cart
      localStorage.removeItem('unchanged_cart');
      window.dispatchEvent(new Event('cartUpdated'));
      navigate("/success");
    }, 2000);
  };

  const subtotal = cartItems.reduce((acc, item) => acc + (parseInt(item.price.replace(/[^0-9]/g, '')) * item.quantity), 0);

  return (
    <div className="min-h-screen bg-[#fcf9f0] pt-32 pb-16 px-6 flex items-center justify-center font-sans text-stone-900">
      <div className="bg-white border border-stone-200 p-8 max-w-md w-full shadow-sm text-center">
        <h1 className="text-2xl font-serif font-medium mb-2">Secure Checkout</h1>
        <p className="text-stone-500 text-sm mb-8">You are paying for {cartItems.length} items.</p>
        
        <div className="bg-stone-50 p-4 mb-8 text-left border border-stone-100">
          <div className="flex justify-between font-bold text-lg">
            <span>Total Payable:</span>
            <span>₹{subtotal}</span>
          </div>
        </div>

        <button 
          onClick={handleDummyPayment}
          disabled={processing}
          className={`w-full py-4 text-white font-bold uppercase tracking-wider transition-colors ${processing ? 'bg-stone-400 cursor-not-allowed' : 'bg-[#3395FF] hover:bg-[#2081ea]'}`}
        >
          {processing ? 'Processing...' : 'Pay with Razorpay (Test)'}
        </button>

        <p className="text-xs text-stone-400 mt-4 text-center">
          This is a dummy payment page for testing purposes. No real transaction will occur.
        </p>
      </div>
    </div>
  );
}
