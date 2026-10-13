import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.config?.skipGlobalError) return Promise.reject(error);
    const url = error.config?.url || "unknown";
    const status = error.response?.status;
    const serverMsg = error.response?.data?.message;

    let detail = `API Error\n\nURL: ${url}`;

    if (error.code === "ECONNABORTED") {
      detail += `\nStatus: Timeout`;
      detail += `\nMessage: The request timed out. The server may be down or unreachable.`;
    } else if (!error.response) {
      detail += `\nStatus: Network Error`;
      detail += `\nMessage: Cannot reach the server.`;
    } else {
      detail += `\nStatus: ${status}`;
      if (serverMsg) detail += `\nServer: ${serverMsg}`;
    }

    alert(detail);
    return Promise.reject(error);
  }
);

export async function loginUser(email, password) {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

export async function registerUser(name, email, password) {
  const { data } = await api.post("/auth/register", { name, email, password });
  return data;
}

export async function getProfile() {
  const { data } = await api.get("/auth/me");
  return data;
}

export async function fetchAllUsers() {
  const { data } = await api.get("/auth/users");
  return data;
}

export async function updateUserRole(userId, role) {
  const { data } = await api.put(`/auth/users/${userId}/role`, { role });
  return data;
}

export async function deleteUser(userId) {
  const { data } = await api.delete(`/auth/users/${userId}`);
  return data;
}

export async function adminCreateProduct(productData) {
  const { data } = await api.post("/products", productData);
  return data;
}

export async function adminFetchProducts() {
  const { data } = await api.get("/products/admin/all");
  return data;
}

export async function uploadProductImage(imageFile) {
  const formData = new FormData();
  formData.append("image", imageFile);
  const { data } = await api.post("/products/upload", formData);
  return data;
}

export async function adminUpdateProduct(productId, productData) {
  const { data } = await api.put(`/products/${productId}`, productData);
  return data;
}

export async function adminDeleteProduct(productId) {
  const { data } = await api.delete(`/products/${productId}`);
  return data;
}

export async function fetchHomepageSettings() {
  const { data } = await api.get("/homepage");
  return data;
}

export async function saveHomepageSettings(settings) {
  const { data } = await api.put("/homepage", settings);
  return data;
}

export async function createOrder(orderData) {
  const { data } = await api.post("/orders", orderData, {
    headers: { "Idempotency-Key": orderData.idempotencyKey },
  });
  return data;
}

export async function createRazorpayOrder(orderData) {
  const { data } = await api.post("/orders/razorpay/order", orderData);
  return data;
}

export async function verifyRazorpayPayment(paymentData) {
  const { data } = await api.post("/orders/razorpay/verify", paymentData);
  return data;
}

export async function lookupPincode(pincode, city = "") {
  const { data } = await api.get(`/orders/location/${pincode}`, { params: { city } });
  return data;
}

export async function lookupCity(city) {
  const { data } = await api.get(`/orders/location/city/${encodeURIComponent(city)}`);
  return data;
}

export async function suggestCities(query) {
  const { data } = await api.get(`/orders/location/cities/${encodeURIComponent(query)}`);
  return data.locations || [];
}

export async function getCheckoutDetails() {
  const { data } = await api.get("/orders/checkout-details");
  return data;
}

export async function getAddresses() {
  const { data } = await api.get("/address");
  return data.addresses || [];
}

export async function createAddress(address) {
  const { data } = await api.post("/address", address);
  return data.address;
}

export async function updateAddress(addressId, address) {
  const { data } = await api.put(`/address/${addressId}`, address);
  return data.address;
}

export async function deleteAddress(addressId) {
  const { data } = await api.delete(`/address/${addressId}`);
  return data;
}

export async function setDefaultAddress(addressId) {
  const { data } = await api.patch(`/address/default/${addressId}`);
  return data.address;
}

export async function updateCheckoutDetails(customer) {
  const { data } = await api.put("/orders/checkout-details", customer);
  return data;
}

export async function fetchMyOrders() {
  const { data } = await api.get("/orders/my");
  return data;
}

export async function fetchAllOrders() {
  const { data } = await api.get("/orders");
  return data;
}

export async function updateOrderStatus(orderId, updates) {
  const { data } = await api.put(`/orders/${orderId}/status`, updates);
  return data;
}

export async function fetchAllReviews() {
  const { data } = await api.get("/reviews/admin");
  return data;
}

export async function updateReviewStatus(reviewId, status) {
  const { data } = await api.put(`/reviews/${reviewId}/status`, { status });
  return data;
}

export async function deleteReview(reviewId) {
  const { data } = await api.delete(`/reviews/${reviewId}`);
  return data;
}

export default api;
