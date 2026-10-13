import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createAddress,
  deleteAddress,
  fetchMyOrders,
  getAddresses,
  getCheckoutDetails,
  lookupPincode,
  setDefaultAddress,
  suggestCities,
  updateAddress,
  updateCheckoutDetails,
} from "../components/api.js";

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  houseNumber: "",
  address: "",
  city: "",
  taluka: "",
  district: "",
  state: "Gujarat",
  pincode: "",
  addressType: "Home",
  isDefault: false,
};

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function date(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function localPhone(phone) {
  return /^91\d{10}$/.test(phone || "") ? phone.slice(2) : phone || "";
}

function addressToProfile(address, email = "") {
  return {
    ...EMPTY,
    name: address.fullName || "",
    email,
    phone: localPhone(address.phone),
    houseNumber: address.addressLine1 || "",
    address: address.addressLine2 || "",
    city: address.city || "",
    taluka: address.taluka || "",
    district: address.district || "",
    state: address.state || "Gujarat",
    pincode: address.pincode || "",
    addressType: address.addressType || "Home",
    isDefault: Boolean(address.isDefault),
  };
}

function UserDashboard() {
  const [profile, setProfile] = useState(EMPTY);
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [editingAddressId, setEditingAddressId] = useState("");
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [tab, setTab] = useState(() => {
    try {
      const requestedTab = new URLSearchParams(window.location.search).get("tab");
      if (requestedTab === "wishlist") return "wishlist";
      if (requestedTab === "profile" || requestedTab === "addresses") return "profile";
    } catch {
      // fallback
    }
    return "orders";
  });

  useEffect(() => {
    // Load wishlist from local storage
    try {
      const storedWishlist = JSON.parse(
        localStorage.getItem("nirali_wishlist") || "[]"
      );
      setWishlist(storedWishlist);
    } catch {
      // safe fallback
    }

    Promise.all([getCheckoutDetails(), fetchMyOrders(), getAddresses()])
      .then(([details, history, savedAddresses]) => {
        const customer = details.customer || {};
        const preferred = savedAddresses.find((address) => address.isDefault) || savedAddresses[0];
        setProfile(
          preferred
            ? addressToProfile(preferred, customer.email)
            : { ...EMPTY, ...customer, phone: localPhone(customer.phone) }
        );
        setEditingAddressId(preferred?.id || "");
        setAddresses(savedAddresses);
        setOrders(history.orders || []);
      })
      .catch((error) => {
        setNoticeType("error");
        setNotice(
          error.response?.status === 401
            ? "Your session expired. Please sign in again to access your account."
            : "Could not load saved account details. Please refresh and try again."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(
    () => ({
      total: orders.length,
      active: orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length,
      delivered: orders.filter((order) => order.status === "delivered").length,
      spent: orders
        .filter((order) => order.status !== "cancelled")
        .reduce((sum, order) => sum + Number(order.total || 0), 0),
    }),
    [orders]
  );

  const change = (event) =>
    setProfile((current) => ({ ...current, [event.target.name]: event.target.value }));

  const findLocation = async () => {
    if (!/^\d{6}$/.test(profile.pincode)) return;
    try {
      const location = await lookupPincode(profile.pincode, profile.city);
      setProfile((current) => ({
        ...current,
        city: current.city || location.city,
        taluka: location.taluka,
        district: location.district,
        state: location.state,
      }));
    } catch {
      // Manual input allowed
    }
  };

  const selectCity = (event) => {
    const city = event.target.value;
    const selected = citySuggestions.find((loc) => loc.name === city);
    setProfile((current) =>
      selected
        ? {
            ...current,
            city,
            taluka: selected.taluka,
            district: selected.district,
            state: selected.state,
            pincode: selected.pincode,
          }
        : { ...current, city }
    );
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setNoticeType("success");
    try {
      const addressPayload = {
        fullName: profile.name,
        phone: profile.phone,
        addressLine1: profile.houseNumber,
        addressLine2: profile.address,
        city: profile.city,
        taluka: profile.taluka,
        district: profile.district,
        state: profile.state,
        pincode: profile.pincode,
        addressType: profile.addressType,
        isDefault: profile.isDefault,
      };
      const savedAddress = editingAddressId
        ? await updateAddress(editingAddressId, addressPayload)
        : await createAddress(addressPayload);
      const result = await updateCheckoutDetails(profile);
      setAddresses(await getAddresses());
      setEditingAddressId(savedAddress.id);
      const savedPhone = result.customer?.phone || "";
      setProfile((current) => ({
        ...current,
        ...result.customer,
        phone: localPhone(savedPhone),
        addressType: savedAddress.addressType,
        isDefault: savedAddress.isDefault,
      }));
      setNotice(editingAddressId ? "Address updated successfully." : "New delivery address saved.");
      setAddressModalOpen(false);
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, name: profile.name }));
    } catch (error) {
      setNoticeType("error");
      setNotice(error.response?.data?.message || "Could not save address changes.");
    } finally {
      setSaving(false);
    }
  };

  const editSavedAddress = (address) => {
    setEditingAddressId(address.id);
    setProfile(addressToProfile(address, profile.email));
    setNotice("");
    setAddressModalOpen(true);
  };

  const addNewAddress = () => {
    setEditingAddressId("");
    setProfile((current) => ({
      ...EMPTY,
      name: current.name,
      email: current.email,
      phone: current.phone,
      state: current.state || "Gujarat",
    }));
    setNotice("");
    setAddressModalOpen(true);
  };

  const makeDefault = async (addressId) => {
    setSaving(true);
    setNotice("");
    setNoticeType("success");
    try {
      const updated = await setDefaultAddress(addressId);
      setAddresses(await getAddresses());
      if (editingAddressId === addressId) setProfile(addressToProfile(updated, profile.email));
      setNotice("Default delivery address updated.");
    } catch (error) {
      setNoticeType("error");
      setNotice(error.response?.data?.message || "Could not update default address.");
    } finally {
      setSaving(false);
    }
  };

  const removeSavedAddress = async (addressId) => {
    if (!window.confirm("Remove this saved delivery address?")) return;
    setSaving(true);
    setNotice("");
    setNoticeType("success");
    try {
      await deleteAddress(addressId);
      const refreshed = await getAddresses();
      setAddresses(refreshed);
      if (editingAddressId === addressId) {
        const next = refreshed.find((a) => a.isDefault) || refreshed[0];
        setEditingAddressId(next?.id || "");
        setProfile(
          next
            ? addressToProfile(next, profile.email)
            : { ...EMPTY, name: profile.name, email: profile.email, phone: profile.phone }
        );
      }
      setNotice("Address removed.");
    } catch (error) {
      setNoticeType("error");
      setNotice(error.response?.data?.message || "Could not remove address.");
    } finally {
      setSaving(false);
    }
  };

  const removeWishlistItem = (id) => {
    const updated = wishlist.filter((item) => item.id !== id);
    setWishlist(updated);
    localStorage.setItem("nirali_wishlist", JSON.stringify(updated));
  };

  if (loading) {
    return (
      <div className="account-loading-luxury">
        <span className="section-eyebrow">NIRALI PATRON PORTAL</span>
        <h3>Loading your patron details...</h3>
      </div>
    );
  }

  return (
    <div className="account-editorial-wrapper">
      
      {/* Account Hero Header */}
      <header className="account-hero-header">
        <div className="account-avatar-circle">
          {profile.name?.charAt(0).toUpperCase() || "N"}
        </div>
        <div className="account-hero-info">
          <span className="section-eyebrow">PATRON CONCIERGE</span>
          <h1 className="account-client-name">Welcome, {profile.name || "Valued Client"}</h1>
          <p className="account-client-email">{profile.email || "Registered Client"}</p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="account-luxury-tabs" role="tablist">
        {[
          ["orders", "Orders History"],
          ["profile", "Delivery Addresses"],
          ["wishlist", `Saved Pieces (${wishlist.length})`],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={`account-tab-btn ${tab === id ? "active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Tab 1: Orders */}
      {tab === "orders" && (
        <section className="account-card-panel">
          <div className="panel-header-row">
            <div>
              <h3>Order History</h3>
              <p className="panel-sub">{orders.length} order{orders.length !== 1 ? "s" : ""} placed</p>
            </div>
          </div>
          {orders.length ? (
            <div className="orders-list">
              {orders.map((order) => (
                <OrderCard order={order} key={order.id} />
              ))}
            </div>
          ) : (
            <EmptyOrders />
          )}
        </section>
      )}

      {/* Tab 3: Saved Addresses */}
      {tab === "profile" && (
        <section className="account-card-panel">
          <div className="panel-header-row">
            <div>
              <h3>Delivery Addresses</h3>
              <p className="panel-sub">Manage where your heirloom pieces are dispatched.</p>
            </div>
            <button type="button" className="btn-primary" onClick={addNewAddress}>
              + Add New Address
            </button>
          </div>

          {notice && <div className={`address-notice ${noticeType}`} role="status">{notice}</div>}

          <div className="saved-addresses-grid">
            {addresses.length ? (
              addresses.map((address) => (
                <article
                  className={`saved-address-card ${address.isDefault ? "default" : ""}`}
                  key={address.id}
                >
                  <div className="address-card-head">
                    <span className="address-type-tag">{address.addressType}</span>
                    {address.isDefault && <span className="badge-gold">Default Address</span>}
                  </div>
                  <h4 className="address-name">{address.fullName}</h4>
                  <p className="address-lines">
                    {address.addressLine1}, {address.addressLine2}
                  </p>
                  <p className="address-city">
                    {address.city}
                    {address.taluka && address.taluka !== "-" ? `, ${address.taluka}` : ""},{" "}
                    {address.district}, {address.state} - {address.pincode}
                  </p>
                  <span className="address-phone">Phone: {localPhone(address.phone)}</span>

                  <div className="address-actions-bar">
                    <button type="button" className="btn-text-link" onClick={() => editSavedAddress(address)}>
                      Edit
                    </button>
                    {!address.isDefault && (
                      <button
                        type="button"
                        className="btn-text-link"
                        onClick={() => makeDefault(address.id)}
                        disabled={saving}
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-text-link delete-link"
                      onClick={() => removeSavedAddress(address.id)}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <h3>No saved addresses</h3>
                <p>Add your primary delivery destination for expedited checkout.</p>
                <button type="button" className="btn-primary" onClick={addNewAddress}>
                  Add Address Now
                </button>
              </div>
            )}
          </div>

          {/* Address Modal Dialog */}
          {addressModalOpen && (
            <div
              className="checkout-address-modal"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget && !saving) setAddressModalOpen(false);
              }}
            >
              <section className="checkout-address-dialog" role="dialog" aria-modal="true">
                <div className="checkout-address-dialog-head">
                  <div>
                    <h3>{editingAddressId ? "Edit Delivery Address" : "Add Delivery Address"}</h3>
                    <p>{editingAddressId ? "Update your saved shipping destination." : "Save a new delivery address."}</p>
                  </div>
                  <button type="button" onClick={() => setAddressModalOpen(false)} disabled={saving}>
                    &times;
                  </button>
                </div>

                <form className="address-form-fields" onSubmit={save}>
                  <div className="form-row two-col">
                    <label className="form-label">
                      Address Label
                      <select name="addressType" className="form-select" value={profile.addressType} onChange={change}>
                        <option>Home</option>
                        <option>Work</option>
                        <option>Other</option>
                      </select>
                    </label>
                    <label className="address-default-label form-checkbox-label">
                      <input
                        type="checkbox"
                        checked={profile.isDefault}
                        onChange={(e) => setProfile((c) => ({ ...c, isDefault: e.target.checked }))}
                      />
                      <span>Set as default address</span>
                    </label>
                  </div>

                  <div className="form-row">
                    <label className="form-label">
                      Full Name
                      <input name="name" className="form-input" value={profile.name} onChange={change} required />
                    </label>
                  </div>

                  <div className="form-row">
                    <label className="form-label">
                      Phone Number
                      <input
                        name="phone"
                        className="form-input"
                        inputMode="tel"
                        maxLength="10"
                        value={profile.phone}
                        onChange={(e) =>
                          setProfile((c) => ({
                            ...c,
                            phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                          }))
                        }
                        required
                      />
                    </label>
                  </div>

                  <div className="form-row">
                    <label className="form-label">
                      House / Flat / Building
                      <input name="houseNumber" className="form-input" value={profile.houseNumber} onChange={change} required />
                    </label>
                  </div>

                  <div className="form-row">
                    <label className="form-label">
                      Street / Area Address
                      <textarea name="address" rows="2" className="form-textarea" value={profile.address} onChange={change} required />
                    </label>
                  </div>

                  <div className="form-row">
                    <label className="form-label">
                      City / Village
                      <input name="city" className="form-input" value={profile.city} onChange={selectCity} required />
                    </label>
                  </div>

                  <div className="form-row two-col">
                    <label className="form-label">
                      District
                      <input name="district" className="form-input" value={profile.district} onChange={change} required />
                    </label>
                    <label className="form-label">
                      State
                      <input name="state" className="form-input" value={profile.state} onChange={change} required />
                    </label>
                  </div>

                  <div className="form-row">
                    <label className="form-label">
                      PIN Code (6 Digits)
                      <input name="pincode" className="form-input" maxLength="6" value={profile.pincode} onChange={change} onBlur={findLocation} required />
                    </label>
                  </div>

                  <div className="address-form-actions">
                    <button type="submit" className="btn-primary" disabled={saving}>
                      {saving ? "Saving..." : "Save Address"}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setAddressModalOpen(false)} disabled={saving}>
                      Cancel
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}
        </section>
      )}

      {/* Tab 4: Wishlist / Saved Pieces */}
      {tab === "wishlist" && (
        <section className="account-card-panel">
          <div className="panel-header-row">
            <div>
              <h3>Saved Pieces</h3>
              <p className="panel-sub">{wishlist.length} curated saree{wishlist.length !== 1 ? "s" : ""} on your wishlist</p>
            </div>
            <a href="/shop" className="btn-secondary">Explore More Sarees</a>
          </div>

          {wishlist.length > 0 ? (
            <div className="wishlist-grid">
              {wishlist.map((item) => (
                <article className="wishlist-card" key={item.id}>
                  <div className="wishlist-image-frame">
                    <a href={`/products/${item.slug}`}>
                      <img src={item.image} alt={item.name} />
                    </a>
                    <button
                      type="button"
                      className="wishlist-remove-btn"
                      onClick={() => removeWishlistItem(item.id)}
                      aria-label="Remove item"
                    >
                      &times;
                    </button>
                  </div>
                  <div className="wishlist-info">
                    <span className="wishlist-cat">{item.category}</span>
                    <h4 className="wishlist-name">
                      <a href={`/products/${item.slug}`}>{item.name}</a>
                    </h4>
                    <div className="wishlist-price">₹{Number(item.price).toLocaleString("en-IN")}</div>
                    <a href={`/products/${item.slug}`} className="btn-primary btn-block" style={{ marginTop: "10px", padding: "0.6rem" }}>
                      View Piece
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>Your wishlist is empty</h3>
              <p>Save sarees you admire while exploring the collection.</p>
              <a href="/shop" className="btn-primary">Browse Catalogue</a>
            </div>
          )}
        </section>
      )}

    </div>
  );
}

function EmptyOrders() {
  return (
    <div className="empty-state">
      <h3>No orders placed yet</h3>
      <p>Discover our heirloom sarees and place your first order.</p>
      <a href="/shop" className="btn-primary">Explore The Collection</a>
    </div>
  );
}

function OrderCard({ order, compact = false }) {
  return (
    <article className={`order-card-luxury ${compact ? "compact" : ""}`}>
      <div className="order-card-header">
        <div>
          <span className="order-id">Order #{String(order.id).slice(-8).toUpperCase()}</span>
          <span className="order-date">Placed on {date(order.createdAt)}</span>
        </div>
        <span className={`order-status-pill status-${order.status}`}>
          {order.status?.toUpperCase()}
        </span>
      </div>

      {!compact && (
        <div className="order-card-items">
          {order.items.map((item) => (
            <div className="order-item-row" key={`${order.id}-${item.slug || item.id}`}>
              <img src={item.image} alt={item.name} className="order-item-img" />
              <div className="order-item-details">
                <strong>{item.name}</strong>
                <span>Quantity: {item.quantity} &bull; {money(item.price)} each</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="order-card-footer">
        <span className="payment-method-tag">
          {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"} &bull; {order.paymentStatus}
        </span>
        <div className="order-total-block">
          <span className="label">Total Amount:</span>
          <strong className="amount">{money(order.total)}</strong>
        </div>
      </div>
    </article>
  );
}

const root = document.getElementById("user-dashboard-root");
if (root) createRoot(root).render(<UserDashboard />);
