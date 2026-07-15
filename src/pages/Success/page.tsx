import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#fcf9f0] pt-32 pb-16 px-6 flex items-center justify-center font-sans text-stone-900">
      <div className="bg-white border border-stone-200 p-12 max-w-lg w-full text-center flex flex-col items-center gap-4">
        <div className="w-full text-center flex flex-col items-center">

          <CheckCircle size={64} className="text-green-500 mb-6" />
          <h1 className="text-3xl font-serif font-medium mb-4">Payment Successful!</h1>
        </div>
        <div className="flex flex-col gap-4">
          <p className="text-stone-600 mb-8">
            Thank you for your purchase. Your order has been confirmed and we will send you an email with the tracking details shortly.
          </p>
          <Link to="/" className="bg-red-500 text-white px-8 py-3 uppercase tracking-wider font-bold hover:bg-red-600 transition-colors">
            Return to Shop
          </Link>
        </div>
      </div>
    </div>
  );
}
