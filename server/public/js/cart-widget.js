const PRIMARY_CART_KEY = 'nirali_cart';
const LEGACY_CART_KEY = 'luxora_cart';

function getCart() {
  const raw = localStorage.getItem(PRIMARY_CART_KEY) || localStorage.getItem(LEGACY_CART_KEY) || '[]';
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  const serialized = JSON.stringify(cart);
  localStorage.setItem(PRIMARY_CART_KEY, serialized);
  localStorage.setItem(LEGACY_CART_KEY, serialized);
  if (window.updateCartCount) window.updateCartCount();
}

function addToCart(product, quantity = 1) {
  const cart = getCart();
  const cartId = product.selectedColor ? `${product.id}:${product.selectedColor}` : product.id;
  const existing = cart.find(item => item.cartId === cartId || (!item.cartId && item.id === cartId));

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      cartId,
      name: product.name,
      slug: product.slug,
      price: product.discountPrice || product.price,
      image: product.image,
      category: product.category,
      color: product.selectedColor || "",
      quantity
    });
  }

  saveCart(cart);
  return true;
}

function updateQuantity(id, quantity) {
  let cart = getCart();
  if (quantity <= 0) {
    cart = cart.filter(item => (item.cartId || item.id) !== id);
  } else {
    const item = cart.find(item => (item.cartId || item.id) === id);
    if (item) item.quantity = quantity;
  }
  saveCart(cart);
}

function removeFromCart(id) {
  const cart = getCart().filter(item => (item.cartId || item.id) !== id);
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem(PRIMARY_CART_KEY);
  localStorage.removeItem(LEGACY_CART_KEY);
  if (window.updateCartCount) window.updateCartCount();
}

function getCartTotals() {
  const cart = getCart();
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 0 ? (subtotal >= 2999 ? 0 : 100) : 0;
  const total = subtotal + shipping;
  return { subtotal, shipping, total, cart };
}

function getCheckoutTotals() {
  const isBuyNow = new URLSearchParams(window.location.search).get('mode') === 'buy-now';
  if (isBuyNow) {
    try {
      const item = JSON.parse(sessionStorage.getItem('nirali_buy_now') || 'null');
      if (item && item.id && Number(item.price) > 0 && Number(item.quantity) > 0) {
        const cart = [item];
        const subtotal = Number(item.price) * Number(item.quantity);
        const shipping = subtotal > 0 ? (subtotal >= 2999 ? 0 : 100) : 0;
        return { subtotal, shipping, total: subtotal + shipping, cart };
      }
    } catch {
      // An invalid direct-purchase payload must not turn into a cart checkout.
    }
    return { subtotal: 0, shipping: 0, total: 0, cart: [] };
  }
  return getCartTotals();
}

// Expose globally under both names for complete backward compatibility
window.LuxoraCart = {
  getCart,
  saveCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  getCartTotals,
  getCheckoutTotals,
};
window.NiraliCart = window.LuxoraCart;
