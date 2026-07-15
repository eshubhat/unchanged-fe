export type CartItem = {
  id: number;
  title: string;
  price: string;
  imageFront: string;
  imageBack: string;
  isLimited: boolean;
  quantity: number;
  size?: string;
  maxStock?: number;
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

/**
 * Add a product to the cart.
 * @param product  The product to add (without quantity).
 * @param quantity How many to add (default 1).
 */
export const addToCart = (product: Omit<CartItem, 'quantity'>, quantity = 1) => {
  const cart = getCart();
  // Match on id AND size (a different size is a different cart line)
  const existingItemIndex = cart.findIndex(
    item => item.id === product.id && item.size === product.size
  );

  if (existingItemIndex !== -1) {
    const item = cart[existingItemIndex];
    const max = item.maxStock ?? 10;
    item.quantity = Math.min(item.quantity + quantity, max);
  } else {
    cart.push({ ...product, quantity });
  }

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event('cartUpdated'));
};

export const removeFromCart = (productId: number, size?: string) => {
  const cart = getCart();
  const updatedCart = cart.filter(
    item => !(item.id === productId && item.size === size)
  );
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
  window.dispatchEvent(new Event('cartUpdated'));
};

export const updateCartQuantity = (productId: number, quantity: number, size?: string) => {
  const cart = getCart();
  const item = cart.find(item => item.id === productId && item.size === size);
  if (item) {
    const max = item.maxStock ?? 10;
    item.quantity = Math.min(Math.max(1, quantity), max);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
  }
};
