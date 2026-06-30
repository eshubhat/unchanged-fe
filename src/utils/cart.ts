export type CartItem = {
  id: number;
  title: string;
  price: string;
  imageFront: string;
  imageBack: string;
  isLimited: boolean;
  quantity: number;
};

const CART_STORAGE_KEY = 'unchanged_cart';

export const getCart = (): CartItem[] => {
  try {
    const cart = localStorage.getItem(CART_STORAGE_KEY);
    return cart ? JSON.parse(cart) : [];
  } catch (error) {
    console.error("Error reading cart from local storage", error);
    return [];
  }
};

export const addToCart = (product: Omit<CartItem, 'quantity'>) => {
  const cart = getCart();
  const existingItemIndex = cart.findIndex(item => item.id === product.id);

  if (existingItemIndex !== -1) {
    cart[existingItemIndex].quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event('cartUpdated'));
};

export const removeFromCart = (productId: number) => {
  const cart = getCart();
  const updatedCart = cart.filter(item => item.id !== productId);
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
  window.dispatchEvent(new Event('cartUpdated'));
};

export const updateCartQuantity = (productId: number, quantity: number) => {
  const cart = getCart();
  const item = cart.find(item => item.id === productId);
  if (item) {
    item.quantity = Math.max(1, quantity);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
  }
};
