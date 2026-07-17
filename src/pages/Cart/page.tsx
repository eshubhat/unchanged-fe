import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCart, removeFromCart, updateCartQuantity } from "../../utils/cart";
import type { CartItem } from "../../utils/cart";
import { Trash2, ArrowLeft, Plus, Minus } from "lucide-react";

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setCartItems(getCart());
  }, []);

  const handleRemove = (id: number, size?: string) => {
    removeFromCart(id, size);
    setCartItems(getCart());
  };

  const handleUpdateQuantity = (id: number, quantity: number, size?: string) => {
    updateCartQuantity(id, quantity, size);
    setCartItems(getCart());
  };

  const parsePrice = (priceStr: string) => {
    return parseInt(priceStr.replace(/[^0-9.]/g, '')) || 0;
  };

  const subtotal = cartItems.reduce((acc, item) => {
    return acc + (parsePrice(item.price) * item.quantity);
  }, 0);

  return (
    <div className="min-h-screen bg-[#fcf9f0] pt-32 pb-16 px-6 md:px-12 font-sans text-stone-900">
      <div className="flex flex-col gap-8 mx-auto">
        <div className="flex flex-col items-start gap-4 mb-8">
          <Link to="/" className="text-stone-500 hover:text-black transition-colors flex items-center gap-2">
            <ArrowLeft size={20} /> Back to Home
          </Link>
          <h1 className="text-3xl font-serif font-medium">Your Cart</h1>
        </div>

        {cartItems.length === 0 ? (
          <div className="flex flex-col p-12 gap-y-4 text-center py-20 bg-white border border-stone-200">
            <h2 className="text-xl font-medium mb-4">Your cart is empty</h2>
            <Link to="/" className="inline-block bg-[#ef4444] text-white px-6 py-3 hover:bg-red-600 transition-colors">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="bg-white border border-stone-200 p-6">
              <div className="hidden md:grid grid-cols-12 gap-4 pb-4 border-b border-stone-200 text-sm uppercase tracking-wider font-bold text-stone-500">
                <div className="col-span-6">Product</div>
                <div className="col-span-2 text-center">Price</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              {cartItems.map((item) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 py-6 border-b border-stone-100 last:border-0 items-center">
                  <div className="col-span-1 md:col-span-6 flex gap-4 items-center">
                    <div className="w-20 h-24 bg-stone-100 flex-shrink-0 relative overflow-hidden">
                      <img src={item.imageFront} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-medium text-lg font-serif">{item.title}</h3>
                      {/* <p className="text-sm text-stone-500 uppercase">White / One Size</p> */}
                      <button
                        onClick={() => handleRemove(item.id, item.size)}
                        className="text-red-500 hover:text-red-700 text-sm mt-2 flex items-center gap-1 md:hidden"
                      >
                        <Trash2 size={16} /> Remove
                      </button>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 text-left md:text-center font-medium">
                    {item.price}
                  </div>

                  <div className="col-span-1 md:col-span-2 flex justify-start md:justify-center">
                    <div className="flex items-center border border-stone-300 w-fit">
                      <button
                        className="px-3 py-1 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1, item.size)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="px-3 text-sm font-medium">{item.quantity}</span>
                      <button
                        className="px-3 py-1 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1, item.size)}
                        disabled={item.quantity >= (item.maxStock ?? 10)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 flex justify-between md:justify-end items-center font-bold gap-x-8">
                    <span className="md:hidden text-stone-500 text-sm font-normal">Total:</span>
                    ₹{parsePrice(item.price) * item.quantity}
                    <button
                      onClick={() => handleRemove(item.id, item.size)}
                      className="text-stone-400 hover:text-red-500 ml-4 hidden md:block"
                      title="Remove item"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white border border-stone-200 p-6 md:w-1/2 ml-auto">
              <h2 className="text-xl font-serif font-medium mb-6">Order Summary</h2>
              <div className="flex justify-between mb-4 text-stone-600">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between mb-4 text-stone-600">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="border-t border-stone-200 my-4"></div>
              <div className="flex justify-between mb-6 font-bold text-lg">
                <span>Total</span>
                <span>₹{subtotal}</span>
              </div>
              <Link to="/checkout" className="w-full bg-[#ef4444] text-white py-4 uppercase tracking-wider font-bold hover:bg-red-600 transition-colors inline-block text-center mt-4">
                Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
