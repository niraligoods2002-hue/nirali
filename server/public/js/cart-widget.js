const CART_KEY = 'luxora_cart';

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
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
  localStorage.removeItem(CART_KEY);
  if (window.updateCartCount) window.updateCartCount();
}

function getCartTotals() {
  const cart = getCart();
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 0 ? 100 : 0;
  const total = subtotal + shipping;
  return { subtotal, shipping, total, cart };
}

// Expose globally
window.LuxoraCart = {
  getCart,
  saveCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  getCartTotals
};
