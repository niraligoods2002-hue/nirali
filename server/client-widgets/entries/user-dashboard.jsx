import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createAddress, deleteAddress, fetchMyOrders, getAddresses, getCheckoutDetails, lookupPincode, setDefaultAddress, suggestCities, updateAddress, updateCheckoutDetails } from "../components/api.js";

const EMPTY = { name: "", email: "", phone: "", houseNumber: "", address: "", city: "", taluka: "", district: "", state: "Gujarat", pincode: "", addressType: "Home", isDefault: false };

function money(value) { return `₹${Number(value || 0).toLocaleString("en-IN")}`; }
function date(value) { return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
function localPhone(phone) { return /^91\d{10}$/.test(phone || "") ? phone.slice(2) : phone || ""; }
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
  const [editingAddressId, setEditingAddressId] = useState("");
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [tab, setTab] = useState("overview");
  const [citySuggestions, setCitySuggestions] = useState([]);

  useEffect(() => {
    Promise.all([getCheckoutDetails(), fetchMyOrders(), getAddresses()])
      .then(([details, history, savedAddresses]) => {
        const customer = details.customer || {};
        const preferred = savedAddresses.find((address) => address.isDefault) || savedAddresses[0];
        setProfile(preferred ? addressToProfile(preferred, customer.email) : { ...EMPTY, ...customer, phone: localPhone(customer.phone) });
        setEditingAddressId(preferred?.id || "");
        setAddresses(savedAddresses);
        setOrders(history.orders || []);
      })
      .catch((error) => {
        setNoticeType("error");
        setNotice(error.response?.status === 401
          ? "Your session expired. Please sign in again to manage addresses."
          : "Could not load your saved addresses. Please refresh and try again.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const query = profile.city.trim();
    if (tab !== "profile" || query.length < 3) { setCitySuggestions([]); return undefined; }
    const timer = setTimeout(() => {
      suggestCities(query).then(setCitySuggestions).catch(() => setCitySuggestions([]));
    }, 350);
    return () => clearTimeout(timer);
  }, [profile.city, tab]);

  const stats = useMemo(() => ({
    total: orders.length,
    active: orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length,
    delivered: orders.filter((order) => order.status === "delivered").length,
    spent: orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + Number(order.total || 0), 0),
  }), [orders]);

  const change = (event) => setProfile((current) => ({ ...current, [event.target.name]: event.target.value }));
  const findLocation = async () => {
    if (!/^\d{6}$/.test(profile.pincode)) return;
    try {
      const location = await lookupPincode(profile.pincode, profile.city);
      setProfile((current) => ({ ...current, city: current.city || location.city, taluka: location.taluka, district: location.district, state: location.state }));
    } catch { /* Address remains manually editable. */ }
  };
  const selectCity = (event) => {
    const city = event.target.value;
    const selected = citySuggestions.find((location) => location.name === city);
    setProfile((current) => selected ? ({ ...current, city, taluka: selected.taluka, district: selected.district, state: selected.state, pincode: selected.pincode }) : ({ ...current, city }));
  };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setNotice(""); setNoticeType("success");
    try {
      const addressPayload = {
        fullName: profile.name, phone: profile.phone, addressLine1: profile.houseNumber,
        addressLine2: profile.address, city: profile.city, taluka: profile.taluka,
        district: profile.district, state: profile.state, pincode: profile.pincode,
        addressType: profile.addressType, isDefault: profile.isDefault,
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
      setNotice(editingAddressId ? "Address updated successfully." : "New address saved successfully.");
      setAddressModalOpen(false);
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...stored, name: profile.name }));
    } catch (error) {
      setNoticeType("error");
      setNotice(error.response?.data?.message || "Could not save this address.");
    } finally { setSaving(false); }
  };
  const editSavedAddress = (address) => {
    setEditingAddressId(address.id);
    setProfile(addressToProfile(address, profile.email));
    setNotice("");
    setAddressModalOpen(true);
  };
  const addNewAddress = () => {
    setEditingAddressId("");
    setProfile((current) => ({ ...EMPTY, name: current.name, email: current.email, phone: current.phone, state: current.state || "Gujarat" }));
    setNotice("");
    setAddressModalOpen(true);
  };
  const makeDefault = async (addressId) => {
    setSaving(true); setNotice(""); setNoticeType("success");
    try {
      const updated = await setDefaultAddress(addressId);
      setAddresses(await getAddresses());
      if (editingAddressId === addressId) setProfile(addressToProfile(updated, profile.email));
      setNotice("Default delivery address updated.");
    } catch (error) {
      setNoticeType("error");
      setNotice(error.response?.data?.message || "Could not update the default address.");
    } finally { setSaving(false); }
  };
  const removeSavedAddress = async (addressId) => {
    if (!window.confirm("Delete this saved delivery address?")) return;
    setSaving(true); setNotice(""); setNoticeType("success");
    try {
      await deleteAddress(addressId);
      const refreshed = await getAddresses();
      setAddresses(refreshed);
      if (editingAddressId === addressId) {
        const next = refreshed.find((address) => address.isDefault) || refreshed[0];
        setEditingAddressId(next?.id || "");
        setProfile(next ? addressToProfile(next, profile.email) : { ...EMPTY, name: profile.name, email: profile.email, phone: profile.phone });
      }
      setNotice("Saved address deleted.");
    } catch (error) {
      setNoticeType("error");
      setNotice(error.response?.data?.message || "Could not delete the address.");
    } finally { setSaving(false); }
  };
  if (loading) return <div className="account-loading">Loading your account...</div>;
  return <>
    <header className="account-hero">
      <div className="account-avatar">{profile.name?.charAt(0).toUpperCase() || "U"}</div>
      <div><span>MY ACCOUNT</span><h1>Welcome, {profile.name || "Customer"}</h1><p>Manage your details, delivery address and orders.</p></div>
    </header>
    <nav className="account-tabs">
      {[['overview','Overview'],['profile','Profile & Address'],['orders','Order History']].map(([id,label]) =>
        <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}
    </nav>

    {tab === "overview" && <div className="account-overview">
      <div className="account-stats">
        <article><span>Total Orders</span><strong>{stats.total}</strong></article>
        <article><span>Active Orders</span><strong>{stats.active}</strong></article>
        <article><span>Delivered</span><strong>{stats.delivered}</strong></article>
        <article><span>Total Value</span><strong>{money(stats.spent)}</strong></article>
      </div>
      <section className="account-panel"><div className="panel-head"><h2>Recent Orders</h2><button onClick={() => setTab("orders")}>View all</button></div>
        {orders.length ? orders.slice(0, 3).map((order) => <OrderCard order={order} compact key={order.id} />) : <EmptyOrders />}
      </section>
    </div>}

    {tab === "profile" && <section className="account-panel">
      <div className="panel-head"><div><h2>Profile & Delivery Addresses</h2><p>View and manage every address saved to your account.</p></div><button type="button" onClick={addNewAddress}>+ Add address</button></div>
      {notice && <div className={`address-notice ${noticeType}`} role="status">{notice}</div>}
      <div className="saved-address-grid">
        {addresses.length ? addresses.map((address) => <article className={`profile-address-card${editingAddressId === address.id ? " selected" : ""}`} key={address.id}>
          <div className="profile-address-card-head"><strong>{address.addressType}</strong>{address.isDefault && <span>Default</span>}</div>
          <h3>{address.fullName}</h3>
          <p>{address.addressLine1}, {address.addressLine2}</p>
          <p>{address.city}{address.taluka && address.taluka !== "-" ? `, ${address.taluka}` : ""}, {address.district}, {address.state} - {address.pincode}</p>
          <small>{localPhone(address.phone)}</small>
          <div className="profile-address-actions">
            <button type="button" onClick={() => editSavedAddress(address)}>Edit</button>
            {!address.isDefault && <button type="button" onClick={() => makeDefault(address.id)} disabled={saving}>Make default</button>}
            <button type="button" className="danger" onClick={() => removeSavedAddress(address.id)} disabled={saving}>Delete</button>
          </div>
        </article>) : <div className="saved-address-empty"><strong>No saved addresses yet</strong><p>Add your first delivery address below.</p></div>}
      </div>
      {addressModalOpen && <div className="address-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setAddressModalOpen(false); }}>
        <section className="address-modal" role="dialog" aria-modal="true" aria-labelledby="address-modal-title">
          <div className="address-modal-head">
            <div><h3 id="address-modal-title">{editingAddressId ? "Edit delivery address" : "Add delivery address"}</h3><p>{editingAddressId ? "Update the selected saved address." : "Save another address to your account."}</p></div>
            <button type="button" aria-label="Close address form" onClick={() => setAddressModalOpen(false)} disabled={saving}>×</button>
          </div>
          <form className="account-form" onSubmit={save}>
            <label>Full Name<input name="name" value={profile.name} onChange={change} required /></label>
            <label>Email<input value={profile.email} readOnly /><small>Email is protected.</small></label>
            <label>Address Type<select name="addressType" value={profile.addressType} onChange={change}><option>Home</option><option>Work</option><option>Other</option></select></label>
            <label>Phone<input name="phone" inputMode="tel" maxLength="10" pattern="[6-9][0-9]{9}" value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value.replace(/\D/g, "").slice(0, 10) }))} required /></label>
            <label>House / Flat Number<input name="houseNumber" value={profile.houseNumber} onChange={change} required /></label>
            <label className="wide">Street / Area Address<textarea name="address" rows="3" value={profile.address} onChange={change} required /></label>
            <label>City / Village<input name="city" list="account-city-options" autoComplete="off" value={profile.city} onChange={selectCity} required /><datalist id="account-city-options">{citySuggestions.map((location) => <option key={`${location.name}-${location.pincode}`} value={location.name}>{location.district}, {location.state} - {location.pincode}</option>)}</datalist></label>
            <label>Taluka<input name="taluka" value={profile.taluka} onChange={change} required /></label>
            <label>District<input name="district" value={profile.district} onChange={change} required /></label>
            <label>State<input name="state" value={profile.state} onChange={change} required /></label>
            <label>PIN Code<input name="pincode" inputMode="numeric" maxLength="6" pattern="[0-9]{6}" value={profile.pincode} onChange={change} onBlur={findLocation} required /></label>
            <label className="account-default-check wide"><input type="checkbox" checked={profile.isDefault} onChange={(event) => setProfile((current) => ({ ...current, isDefault: event.target.checked }))} />Use as my default delivery address</label>
            <div className="address-modal-actions wide">
              <button type="submit" disabled={saving}>{saving ? "Saving..." : "Change"}</button>
              <button type="button" onClick={() => setAddressModalOpen(false)} disabled={saving}>Cancel</button>
            </div>
          </form>
        </section>
      </div>}
    </section>}

    {tab === "orders" && <section className="account-panel">
      <div className="panel-head"><div><h2>Order History</h2><p>{orders.length} order{orders.length !== 1 ? "s" : ""}</p></div></div>
      {orders.length ? orders.map((order) => <OrderCard order={order} key={order.id} />) : <EmptyOrders />}
    </section>}
  </>;
}

function EmptyOrders() { return <div className="account-empty"><h3>No orders yet</h3><p>Your purchases will appear here.</p><a href="/shop">Start Shopping</a></div>; }
function OrderCard({ order, compact = false }) {
  return <article className={`customer-order ${compact ? "compact" : ""}`}>
    <div className="customer-order-head"><div><strong>#{String(order.id).slice(-6).toUpperCase()}</strong><span>{date(order.createdAt)}</span></div><span className={`customer-status status-${order.status}`}>{order.status}</span></div>
    {!compact && <div className="customer-order-items">{order.items.map((item) => <div key={`${order.id}-${item.slug}`}><img src={item.image} alt={item.name} /><span><strong>{item.name}</strong><small>Qty {item.quantity} · {money(item.price)}</small></span></div>)}</div>}
    <div className="customer-order-foot"><span>{order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod} · {order.paymentStatus}</span><strong>{money(order.total)}</strong></div>
  </article>;
}

const root = document.getElementById("user-dashboard-root");
if (root) createRoot(root).render(<UserDashboard />);
