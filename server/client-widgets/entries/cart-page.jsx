import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createOrder, createRazorpayOrder, verifyRazorpayPayment, lookupPincode, lookupCity, suggestCities, getCheckoutDetails, getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from "../components/api.js";

function CartPage() {
  const [cart, setCart] = useState([]);
  const [totals, setTotals] = useState({ subtotal: 0, shipping: 0, total: 0 });

  const refresh = () => {
    if (window.LuxoraCart) {
      const { cart: c, subtotal, shipping, total } = window.LuxoraCart.getCartTotals();
      setCart(c);
      setTotals({ subtotal, shipping, total });
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const emptyEl = document.getElementById("cart-empty");
    if (emptyEl) {
      emptyEl.classList.toggle("hidden", cart.length > 0);
    }
  }, [cart]);

  const updateQty = (id, qty) => {
    window.LuxoraCart.updateQuantity(id, qty);
    refresh();
  };

  const remove = (id) => {
    window.LuxoraCart.removeFromCart(id);
    refresh();
  };

  const startCheckout = () => {
    sessionStorage.removeItem("nirali_buy_now");
    sessionStorage.removeItem("nirali_buy_now_order_key");
    if (!localStorage.getItem("token")) {
      localStorage.setItem("redirectAfterLogin", "/checkout");
      window.location.href = "/login?redirect=/checkout";
      return;
    }

    window.location.href = "/checkout";
  };

  if (cart.length === 0) {
    return null;
  }

  return (
    <div className="cart-layout">
      <div className="cart-items">
        {cart.map((item) => (
          <div className="cart-item" key={item.cartId || item.id}>
            <div className="cart-item-image">
              <img src={item.image} alt={item.name} />
            </div>
            <div className="cart-item-info">
              <span className="cart-item-category">{item.category}</span>
              <a href={`/products/${item.slug}`} className="cart-item-name">{item.name}</a>
              {item.color && <span className="cart-item-category">Color: {item.color}</span>}
              <span className="cart-item-price">₹{item.price.toLocaleString()}</span>
            </div>
            <div className="quantity-selector">
              <button onClick={() => updateQty(item.cartId || item.id, item.quantity - 1)}>-</button>
              <span>{item.quantity}</span>
              <button onClick={() => updateQty(item.cartId || item.id, item.quantity + 1)}>+</button>
            </div>
            <div className="item-total">₹{(item.price * item.quantity).toLocaleString()}</div>
            <button className="remove-btn" onClick={() => remove(item.cartId || item.id)} aria-label="Remove">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <h3>Order Summary</h3>
        <div className="summary-row">
          <span>Subtotal</span>
          <span>₹{totals.subtotal.toLocaleString()}</span>
        </div>
        <div className="summary-row">
          <span>Shipping</span>
          <span>₹{totals.shipping.toLocaleString()}</span>
        </div>
        <div className="summary-row summary-total">
          <span>Total</span>
          <span>₹{totals.total.toLocaleString()}</span>
        </div>
        <button type="button" className="btn-primary btn-block" onClick={startCheckout}>Proceed to Checkout</button>
        <a href="/shop" className="btn-secondary btn-block" style={{ marginTop: "12px" }}>Continue Shopping</a>
      </div>
    </div>
  );
}

const root = document.getElementById("cart-root");
if (root) {
  createRoot(root).render(<CartPage />);
}

// Checkout summary
const checkoutSummary = document.getElementById("checkout-summary");
if (checkoutSummary) {
  function CheckoutSummary() {
    const [totals, setTotals] = useState({ subtotal: 0, shipping: 0, total: 0, cart: [] });

    useEffect(() => {
      if (window.LuxoraCart) {
        setTotals(window.LuxoraCart.getCheckoutTotals());
      }
    }, []);

    return (
      <>
        <div className="checkout-items">
          {totals.cart.map((item) => (
            <div className="checkout-item" key={item.id}>
              <img src={item.image} alt={item.name} />
              <div>
                <span className="checkout-item-name">{item.name}</span>
                <span className="checkout-item-qty">Qty: {item.quantity}</span>
              </div>
              <span className="checkout-item-price">₹{(item.price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="summary-row">
          <span>Subtotal</span>
          <span>₹{totals.subtotal.toLocaleString()}</span>
        </div>
        <div className="summary-row">
          <span>Shipping</span>
          <span>₹{totals.shipping.toLocaleString()}</span>
        </div>
        <div className="summary-row summary-total">
          <span>Total</span>
          <span>₹{totals.total.toLocaleString()}</span>
        </div>
      </>
    );
  }

  createRoot(checkoutSummary).render(<CheckoutSummary />);
}

// Checkout form handler
const checkoutForm = document.getElementById("checkout-form");
if (checkoutForm) {
  const phoneField = document.getElementById("checkout-phone-field");
  let pendingOrder = null;
  let lastLookedUpPincode = "";
  const locationStatus = document.getElementById("location-lookup-status");
  const savedAddressStatus = document.getElementById("saved-address-status");
  const addressModal = document.getElementById("checkout-address-modal");
  const addressFields = document.getElementById("address-form-fields");
  const selectedAddressCard = document.getElementById("selected-address-card");
  const addressPicker = document.getElementById("address-picker");
  const addressList = document.getElementById("saved-address-list");
  const changeAddressButton = document.getElementById("change-address");
  const addAddressButton = document.getElementById("add-new-address");
  const saveAddressButton = document.getElementById("save-address");
  const cancelAddressButton = document.getElementById("cancel-address");
  const closeAddressModalButton = document.getElementById("close-address-modal");
  let addresses = [];
  let selectedAddressId = null;
  let editingAddressId = null;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

  const addressById = (id) => addresses.find((address) => address.id === id);
  const addressPhone = (phone) => /^91\d{10}$/.test(phone || "") ? phone.slice(2) : phone || "";
  const setPhoneFieldVisible = (visible) => {
    phoneField.hidden = !visible;
    checkoutForm.elements.phone.required = visible;
  };
  const setAddressFormVisible = (visible) => {
    addressModal.hidden = !visible;
    addressFields.querySelectorAll("input, textarea, select").forEach((field) => { field.disabled = !visible; });
  };
  const fillAddressForm = (address = {}) => {
    const values = {
      name: address.fullName || "", phone: addressPhone(address.phone), houseNumber: address.addressLine1 || "",
      address: address.addressLine2 || "", city: address.city || "", taluka: address.taluka || "-",
      district: address.district || "", state: address.state || "Gujarat", pincode: address.pincode || "",
      addressType: address.addressType || "Home",
    };
    Object.entries(values).forEach(([name, value]) => { if (checkoutForm.elements[name]) checkoutForm.elements[name].value = value; });
    checkoutForm.elements.isDefault.checked = Boolean(address.isDefault);
  };
  const addressPayload = () => ({
    fullName: checkoutForm.elements.name.value,
    phone: checkoutForm.elements.phone.value,
    addressLine1: checkoutForm.elements.houseNumber.value,
    addressLine2: checkoutForm.elements.address.value,
    city: checkoutForm.elements.city.value,
    taluka: checkoutForm.elements.taluka.value,
    district: checkoutForm.elements.district.value,
    state: checkoutForm.elements.state.value,
    pincode: checkoutForm.elements.pincode.value,
    addressType: checkoutForm.elements.addressType.value,
    isDefault: checkoutForm.elements.isDefault.checked,
  });
  const selectAddress = (address) => {
    selectedAddressId = address.id;
    editingAddressId = null;
    selectedAddressCard.hidden = false;
    fillAddressForm(address);
    selectedAddressCard.innerHTML = `<div><span>${escapeHtml(address.addressType)}${address.isDefault ? " · Default" : ""}</span><strong>${escapeHtml(address.fullName)}</strong><p>${escapeHtml(address.addressLine1)}, ${escapeHtml(address.addressLine2)}, ${escapeHtml(address.city)}, ${escapeHtml(address.district)}, ${escapeHtml(address.state)} - ${escapeHtml(address.pincode)}</p><small>${escapeHtml(addressPhone(address.phone))}</small></div>`;
    addressPicker.hidden = true;
    setAddressFormVisible(false);
    savedAddressStatus.hidden = false;
    savedAddressStatus.textContent = "This address will be used for this order.";
  };
  const renderAddresses = () => {
    addressList.replaceChildren(...addresses.map((address) => {
      const row = document.createElement("article");
      row.className = `saved-address-option${address.id === selectedAddressId ? " selected" : ""}`;
      row.innerHTML = `<label><input type="radio" name="savedAddress" value="${escapeHtml(address.id)}" ${address.id === selectedAddressId ? "checked" : ""}><span><b>${escapeHtml(address.addressType)}${address.isDefault ? " · Default" : ""}</b><strong>${escapeHtml(address.fullName)}</strong><small>${escapeHtml(address.addressLine1)}, ${escapeHtml(address.addressLine2)}, ${escapeHtml(address.city)} - ${escapeHtml(address.pincode)}</small><small>${escapeHtml(addressPhone(address.phone))}</small></span></label><div><button type="button" data-action="edit">Edit</button>${address.isDefault ? "" : '<button type="button" data-action="default">Make default</button>'}<button type="button" data-action="delete">Delete</button></div>`;
      row.querySelector("input").addEventListener("change", () => selectAddress(address));
      row.querySelector('[data-action="edit"]').addEventListener("click", () => {
        editingAddressId = address.id;
        fillAddressForm(address);
        setPhoneFieldVisible(true);
        setAddressFormVisible(true);
      });
      row.querySelector('[data-action="default"]')?.addEventListener("click", async () => { await setDefaultAddress(address.id); await loadAddresses(address.id); });
      row.querySelector('[data-action="delete"]').addEventListener("click", async () => { if (!window.confirm("Delete this saved address?")) return; await deleteAddress(address.id); await loadAddresses(); });
      return row;
    }));
  };
  const loadAddresses = async (preferredId) => {
    addresses = await getAddresses();
    const selected = addressById(preferredId) || addressById(selectedAddressId) || addresses.find((address) => address.isDefault) || addresses[0];
    renderAddresses();
    if (selected) selectAddress(selected);
    else {
      selectedAddressCard.hidden = true;
      fillAddressForm();
      setPhoneFieldVisible(true);
      setAddressFormVisible(true);
    }
  };

  getCheckoutDetails().then(({ customer }) => {
    Object.entries(customer || {}).forEach(([name, value]) => {
      const field = checkoutForm.elements[name];
      if (!field || !value) return;
      field.value = name === "phone" && /^91\d{10}$/.test(value) ? value.slice(2) : value;
    });
    return loadAddresses();
  }).catch(() => {
    // The checkout API remains protected; the page redirect handles expired sessions.
  });

  changeAddressButton.addEventListener("click", () => { renderAddresses(); addressPicker.hidden = false; setAddressFormVisible(false); });
  addAddressButton.addEventListener("click", () => {
    editingAddressId = null;
    const existingPhone = addressPhone(addressById(selectedAddressId)?.phone || addresses[0]?.phone);
    fillAddressForm({ phone: existingPhone });
    setPhoneFieldVisible(addresses.length === 0);
    setAddressFormVisible(true);
  });
  const closeAddressModal = () => {
    const selected = addressById(selectedAddressId);
    if (selected) fillAddressForm(selected);
    setAddressFormVisible(false);
  };
  cancelAddressButton.addEventListener("click", closeAddressModal);
  closeAddressModalButton.addEventListener("click", closeAddressModal);
  addressModal.addEventListener("mousedown", (event) => {
    if (event.target === addressModal && !saveAddressButton.disabled) closeAddressModal();
  });
  saveAddressButton.addEventListener("click", async () => {
    if (!addressFields.querySelector(":invalid")) {
      saveAddressButton.disabled = true;
      savedAddressStatus.hidden = false;
      savedAddressStatus.textContent = "Saving address...";
      try {
        const saved = editingAddressId ? await updateAddress(editingAddressId, addressPayload()) : await createAddress(addressPayload());
        await loadAddresses(saved.id);
        savedAddressStatus.textContent = "Address saved successfully.";
      } catch (error) {
        savedAddressStatus.textContent = error.response?.data?.message || "Could not save address.";
      } finally { saveAddressButton.disabled = false; }
    } else addressFields.querySelector(":invalid").reportValidity();
  });

  const populateLocation = async () => {
    const pincode = checkoutForm.elements.pincode.value.trim();
    if (!/^\d{6}$/.test(pincode) || pincode === lastLookedUpPincode) return;
    locationStatus.textContent = "Finding district and state...";
    try {
      const location = await lookupPincode(pincode, checkoutForm.elements.city.value);
      if (!checkoutForm.elements.city.value.trim()) checkoutForm.elements.city.value = location.city;
      checkoutForm.elements.taluka.value = location.taluka;
      checkoutForm.elements.district.value = location.district;
      checkoutForm.elements.state.value = location.state;
      lastLookedUpPincode = pincode;
      locationStatus.textContent = `${location.district}, ${location.state}`;
    } catch {
      locationStatus.textContent = "Could not find location automatically. Please enter it manually.";
    }
  };

  checkoutForm.elements.pincode.addEventListener("input", () => {
    if (checkoutForm.elements.pincode.value.trim().length === 6) populateLocation();
    else { lastLookedUpPincode = ""; locationStatus.textContent = ""; }
  });
  checkoutForm.elements.pincode.addEventListener("blur", populateLocation);
  let cityLookupTimer;
  let citySuggestionTimer;
  const cityOptions = document.getElementById("india-city-options");
  const populateLocationFromCity = async () => {
    const city = checkoutForm.elements.city.value.trim();
    if (city.length < 3) return;
    if (/^\d{6}$/.test(checkoutForm.elements.pincode.value.trim())) {
      lastLookedUpPincode = "";
      return populateLocation();
    }
    locationStatus.textContent = "Finding district and state...";
    try {
      const location = await lookupCity(city);
      if (checkoutForm.elements.city.value.trim() !== city) return;
      checkoutForm.elements.taluka.value = location.taluka;
      checkoutForm.elements.district.value = location.district;
      checkoutForm.elements.state.value = location.state;
      locationStatus.textContent = `${location.district}, ${location.state}`;
    } catch {
      locationStatus.textContent = "Could not find this city automatically. Please enter it manually.";
    }
  };
  checkoutForm.elements.city.addEventListener("input", () => {
    clearTimeout(cityLookupTimer);
    clearTimeout(citySuggestionTimer);
    checkoutForm.elements.district.value = "";
    checkoutForm.elements.state.value = "";
    const query = checkoutForm.elements.city.value.trim();
    if (query.length >= 3) {
      citySuggestionTimer = setTimeout(async () => {
        try {
          const locations = await suggestCities(query);
          if (checkoutForm.elements.city.value.trim() !== query) return;
          cityOptions.replaceChildren(...locations.map((location) => {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "city-suggestion";
            option.setAttribute("role", "option");
            option.dataset.value = location.name;
            option.dataset.taluka = location.taluka;
            option.dataset.district = location.district;
            option.dataset.state = location.state;
            option.dataset.pincode = location.pincode;
            const name = document.createElement("strong");
            name.textContent = location.name;
            const detail = document.createElement("small");
            detail.textContent = `${location.district}, ${location.state}${location.pincode ? ` - ${location.pincode}` : ""}`;
            option.append(name, detail);
            return option;
          }));
          cityOptions.hidden = locations.length === 0;
        } catch { cityOptions.replaceChildren(); cityOptions.hidden = true; }
      }, 350);
    } else { cityOptions.replaceChildren(); cityOptions.hidden = true; }
    cityLookupTimer = setTimeout(populateLocationFromCity, 900);
  });
  cityOptions.addEventListener("pointerdown", (event) => event.preventDefault());
  cityOptions.addEventListener("click", (event) => {
    const selected = event.target.closest(".city-suggestion");
    if (!selected) return;
    checkoutForm.elements.city.value = selected.dataset.value || "";
    checkoutForm.elements.taluka.value = selected.dataset.taluka || "-";
    checkoutForm.elements.district.value = selected.dataset.district || "";
    checkoutForm.elements.state.value = selected.dataset.state || "";
    checkoutForm.elements.pincode.value = selected.dataset.pincode || "";
    lastLookedUpPincode = selected.dataset.pincode || "";
    locationStatus.textContent = `${selected.dataset.district}, ${selected.dataset.state}`;
    cityOptions.hidden = true;
  });
  checkoutForm.elements.city.addEventListener("focus", () => {
    if (cityOptions.children.length) cityOptions.hidden = false;
  });
  checkoutForm.elements.city.addEventListener("keydown", (event) => {
    if (event.key === "Escape") cityOptions.hidden = true;
    if (event.key === "ArrowDown" && !cityOptions.hidden) {
      event.preventDefault();
      cityOptions.querySelector(".city-suggestion")?.focus();
    }
  });
  checkoutForm.elements.city.addEventListener("blur", () => {
    clearTimeout(cityLookupTimer);
    setTimeout(() => { cityOptions.hidden = true; }, 150);
    populateLocationFromCity();
  });

  const setSubmitState = (busy, label = "Place Order") => {
    const button = checkoutForm.querySelector('button[type="submit"]');
    if (button) { button.disabled = busy; button.textContent = label; }
  };

  const finishOrder = async (orderData, paymentAlreadyVerified = false) => {
    setSubmitState(true, "Placing Order...");
    if (!paymentAlreadyVerified) await createOrder(orderData);
    alert("Order placed successfully! Thank you for shopping with Nirali Saree.");
    const isBuyNow = new URLSearchParams(window.location.search).get("mode") === "buy-now";
    if (isBuyNow) {
      sessionStorage.removeItem("nirali_buy_now");
      sessionStorage.removeItem("nirali_buy_now_order_key");
    } else {
      window.LuxoraCart?.clearCart();
    }
    sessionStorage.removeItem("checkoutOrderKey");
    window.location.href = "/shop";
  };

  checkoutForm.elements.phone.addEventListener("input", () => {
    checkoutForm.elements.phone.value = checkoutForm.elements.phone.value.replace(/\D/g, "").slice(0, 10);
    if (pendingOrder && pendingOrder.customer.phone !== checkoutForm.elements.phone.value) pendingOrder = null;
  });

  checkoutForm.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
    input.addEventListener("change", () => {
      checkoutForm.querySelectorAll(".payment-method-card").forEach((card) => {
        card.classList.toggle("active", card.contains(input) && input.checked);
      });
    });
    input.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 900px)").matches) {
        window.setTimeout(() => document.getElementById("shipping-details")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    });
  });

  checkoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const totals = window.LuxoraCart?.getCheckoutTotals();
    if (!totals || totals.cart.length === 0) {
      alert("Your cart is empty");
      window.location.href = "/shop";
      return;
    }

    setSubmitState(true, "Placing Order...");

    try {
      const formData = new FormData(checkoutForm);
      if (!selectedAddressId) {
        savedAddressStatus.hidden = false;
        savedAddressStatus.textContent = "Save this address before placing your order.";
        setSubmitState(false);
        saveAddressButton.focus();
        return;
      }
      const selectedAddress = addressById(selectedAddressId);
      const isBuyNow = new URLSearchParams(window.location.search).get("mode") === "buy-now";
      const orderKeyStorage = isBuyNow ? "nirali_buy_now_order_key" : "checkoutOrderKey";
      pendingOrder = {
        idempotencyKey: sessionStorage.getItem(orderKeyStorage) || window.crypto?.randomUUID?.().replaceAll("-", "") || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        addressId: selectedAddressId,
        customer: { phone: addressPhone(selectedAddress.phone) },
        items: totals.cart,
        paymentMethod: formData.get("paymentMethod") || "cod",
      };
      sessionStorage.setItem(orderKeyStorage, pendingOrder.idempotencyKey);
      if (pendingOrder.paymentMethod === "razorpay") {
        if (!window.Razorpay) throw new Error("Razorpay Checkout did not load. Please try again.");
        const gatewayOrder = await createRazorpayOrder({
          addressId: pendingOrder.addressId,
          items: pendingOrder.items,
          idempotencyKey: pendingOrder.idempotencyKey,
        });
        const checkout = new window.Razorpay({
          key: gatewayOrder.keyId,
          amount: gatewayOrder.amount,
          currency: gatewayOrder.currency,
          name: "NIRALI",
          description: "Secure payment for your saree order",
          order_id: gatewayOrder.orderId,
          prefill: {
            name: selectedAddress.fullName,
            email: localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).email : "",
            contact: addressPhone(selectedAddress.phone),
          },
          theme: { color: "#174d3e" },
          handler: async (paymentResponse) => {
            try {
              setSubmitState(true, "Verifying Payment...");
              await verifyRazorpayPayment({
                ...paymentResponse,
                addressId: pendingOrder.addressId,
                items: pendingOrder.items,
                idempotencyKey: pendingOrder.idempotencyKey,
              });
              await finishOrder(null, true);
            } catch (error) {
              setSubmitState(false);
              const message = error.response?.data?.message || error.message || "Payment verification failed. Contact support before retrying.";
              alert(message);
            }
          },
          modal: { ondismiss: () => setSubmitState(false) },
        });
        checkout.on("payment.failed", (event) => {
          setSubmitState(false);
          alert(event.error?.description || "Payment failed. You can try again.");
        });
        checkout.open();
      } else {
        await finishOrder(pendingOrder);
      }
    } catch {
      setSubmitState(false);
    }
  });
}
