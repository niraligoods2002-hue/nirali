import React, { useEffect, useState } from "react";
import { fetchAllOrders, updateOrderStatus } from "../api.js";

const ORDER_STATUSES = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";
}

function formatPrice(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatPaymentMethod(value) {
  if (value === "cod") return "Cash on Delivery";
  if (value === "razorpay") return "Razorpay";
  return value || "Not selected";
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchAllOrders();
      setOrders(data.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const updateOrder = async (orderId, updates) => {
    setSavingId(orderId);
    try {
      const data = await updateOrderStatus(orderId, updates);
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? data.order : order))
      );
    } catch {
      // API helper already shows a useful error.
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <div className="admin-loading">Loading orders...</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-top-bar">
        <div>
          <h1>Orders</h1>
          <p>{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="admin-empty-panel">No orders yet. New checkout orders will appear here.</div>
      ) : (
        <div className="admin-order-list">
          {orders.map((order) => (
            <article className="admin-order-card" key={order.id}>
              <div className="admin-order-head">
                <div>
                  <span className="admin-order-id">#{String(order.id).slice(-6).toUpperCase()}</span>
                  <h2>{order.customer?.name}</h2>
                  <p>{formatDate(order.createdAt)}</p>
                </div>
                <div className="admin-order-total">{formatPrice(order.total)}</div>
              </div>

              <div className="admin-order-meta">
                <span>{order.customer?.phone}</span>
                <span>{order.customer?.email}</span>
                <span>{order.customer?.city} - {order.customer?.pincode}</span>
              </div>

              <p className="admin-order-address">
                {order.customer?.houseNumber && `${order.customer.houseNumber}, `}
                {order.customer?.address}, {order.customer?.city}, {order.customer?.taluka && `${order.customer.taluka} Taluka, `}
                {order.customer?.district && `${order.customer.district} District, `}{order.customer?.state} - {order.customer?.pincode}
              </p>

              <div className="admin-order-items">
                {order.items.map((item) => (
                  <div className="admin-order-item" key={`${order.id}-${item.slug}`}>
                    <img src={item.image} alt={item.name} />
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.category} · Qty {item.quantity}</span>
                    </div>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="admin-order-controls">
                <div className="admin-order-method">
                  <span>Payment Method</span>
                  <strong>{formatPaymentMethod(order.paymentMethod)}</strong>
                </div>

                <a
                  className="admin-label-download"
                  href={`/api/orders/${order.id}/delivery-label`}
                  download={`delivery-label-${String(order.id).slice(-6).toUpperCase()}.pdf`}
                >
                  Download Label PDF
                </a>

                <label>
                  Order Status
                  <select
                    value={order.status}
                    disabled={savingId === order.id}
                    onChange={(event) => updateOrder(order.id, { status: event.target.value })}
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option value={status} key={status}>{status}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Payment
                  <select
                    value={order.paymentStatus}
                    disabled={savingId === order.id}
                    onChange={(event) => updateOrder(order.id, { paymentStatus: event.target.value })}
                  >
                    {PAYMENT_STATUSES.map((status) => (
                      <option value={status} key={status}>{status}</option>
                    ))}
                  </select>
                </label>

                <span className={`admin-order-badge status-${order.status}`}>
                  {savingId === order.id ? "saving..." : order.status}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
