import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCart } from "../../utils/cart";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const cartItems = getCart();
  const [formData, setFormData] = useState({
    email: '',
    password: '', // Dummy for now, in a real app this creates account or logs in
    fullName: '',
    phone: '',
    addressLine1: '',
    city: '',
    state: '',
    pincode: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate backend call to create user and address
    console.log("Submitting checkout data to backend...", formData);
    
    // In a real integration:
    // 1. fetch('/api/v1/auth/register', { method: 'POST', body: JSON.stringify({ email, password, fullName }) })
    // 2. fetch('/api/v1/address', { method: 'POST', body: JSON.stringify({ ...addressFields }) })
    // 3. Navigate to payment page
    
    navigate("/payment");
  };

  const subtotal = cartItems.reduce((acc, item) => acc + (parseInt(item.price.replace(/[^0-9]/g, '')) * item.quantity), 0);

  return (
    <div className="min-h-screen bg-[#fcf9f0] pt-32 pb-16 px-6 md:px-12 font-sans text-stone-900">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-12">
        
        {/* Left side: Form */}
        <div className="flex-1">
          <h1 className="text-3xl font-serif font-medium mb-8">Checkout</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            <div className="bg-white border border-stone-200 p-6">
              <h2 className="font-bold uppercase tracking-wider text-sm mb-4">Account (Login/Register)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required name="email" value={formData.email} onChange={handleChange} type="email" placeholder="Email Address" className="border border-stone-300 p-3 w-full" />
                <input required name="password" value={formData.password} onChange={handleChange} type="password" placeholder="Password (to create account)" className="border border-stone-300 p-3 w-full" />
              </div>
            </div>

            <div className="bg-white border border-stone-200 p-6">
              <h2 className="font-bold uppercase tracking-wider text-sm mb-4">Shipping Address</h2>
              <div className="flex flex-col gap-4">
                <input required name="fullName" value={formData.fullName} onChange={handleChange} type="text" placeholder="Full Name" className="border border-stone-300 p-3 w-full" />
                <input required name="phone" value={formData.phone} onChange={handleChange} type="tel" placeholder="Phone Number" className="border border-stone-300 p-3 w-full" />
                <input required name="addressLine1" value={formData.addressLine1} onChange={handleChange} type="text" placeholder="Address (House No, Building, Street, Area)" className="border border-stone-300 p-3 w-full" />
                <div className="grid grid-cols-2 gap-4">
                  <input required name="city" value={formData.city} onChange={handleChange} type="text" placeholder="City" className="border border-stone-300 p-3 w-full" />
                  <input required name="state" value={formData.state} onChange={handleChange} type="text" placeholder="State" className="border border-stone-300 p-3 w-full" />
                </div>
                <input required name="pincode" value={formData.pincode} onChange={handleChange} type="text" placeholder="PIN Code" className="border border-stone-300 p-3 w-full md:w-1/2" />
              </div>
            </div>

            <button type="submit" className="w-full bg-black text-white py-4 uppercase tracking-wider font-bold hover:bg-stone-800 transition-colors">
              Continue to Payment
            </button>
          </form>
        </div>

        {/* Right side: Summary */}
        <div className="w-full md:w-80 flex-shrink-0">
          <div className="bg-white border border-stone-200 p-6 sticky top-28">
            <h2 className="text-xl font-serif font-medium mb-6">Order Summary</h2>
            <div className="flex flex-col gap-4 mb-6">
              {cartItems.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{item.quantity}x</span>
                    <span className="text-stone-600 truncate max-w-[150px]">{item.title}</span>
                  </div>
                  <span className="font-medium">₹{parseInt(item.price.replace(/[^0-9]/g, '')) * item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-stone-200 my-4"></div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>₹{subtotal}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
