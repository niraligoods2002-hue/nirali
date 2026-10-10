import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchAllOrders, fetchAllReviews, fetchAllUsers } from "../api.js";

const BagIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const TrendingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
  </svg>
);

const OrdersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2.25 4.5H6.75A2.25 2.25 0 014.5 18.25V5.75A2.25 2.25 0 016.75 3.5h7.5L19.5 8.75v9.5a2.25 2.25 0 01-2.25 2.25z" />
  </svg>
);

const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.75.75 0 011.04 0l2.1 2.037 2.914.424a.75.75 0 01.416 1.279l-2.107 2.054.498 2.902a.75.75 0 01-1.088.79L12 11.274l-2.606 1.711a.75.75 0 01-1.088-.79l.498-2.902-2.107-2.054a.75.75 0 01.416-1.279l2.914-.424 1.453-2.037z" />
  </svg>
);

function formatPrice(val) {
  return `₹${Number(val || 0).toLocaleString("en-IN")}`;
}

function formatDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    reviews: 0,
    users: 0,
    revenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()).catch(() => []),
      fetchAllOrders().catch(() => ({ orders: [] })),
      fetchAllReviews().catch(() => ({ reviews: [] })),
      fetchAllUsers().catch(() => ({ users: [] })),
    ])
      .then(([productsData, ordersData, reviewsData, usersData]) => {
        const productList = Array.isArray(productsData) ? productsData : [];
        const orderList = Array.isArray(ordersData.orders) ? ordersData.orders : [];
        const reviewList = Array.isArray(reviewsData.reviews) ? reviewsData.reviews : [];
        const userList = Array.isArray(usersData.users) ? usersData.users : [];

        const totalRev = orderList.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        const lowStock = productList.filter((p) => (Number(p.stock) || 0) <= 5);

        setStats({
          products: productList.length,
          orders: orderList.length,
          reviews: reviewList.length,
          users: userList.length,
          revenue: totalRev,
        });

        setRecentOrders(orderList.slice(0, 5));
        setLowStockProducts(lowStock.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <span>Loading Atelier intelligence...</span>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-header-title-wrap">
          <span className="admin-eyebrow">EXECUTIVE ATELIER CONSOLE</span>
          <h1>House Overview</h1>
          <p>Real-time analytics, inventory posture, and patron acquisitions.</p>
        </div>
        <div className="admin-header-actions">
          <Link to="/products?create=1" className="admin-action-btn-gold">
            + Add New Saree
          </Link>
          <a href="/" target="_blank" rel="noopener noreferrer" className="admin-action-btn-secondary">
            View Live Boutique ↗
          </a>
        </div>
      </div>

      <div className="admin-cards">
        <div className="admin-card">
          <div className="admin-card-head">
            <div className="admin-card-icon forest">
              <TrendingIcon />
            </div>
            <span className="admin-card-trend">Cumulative Gross</span>
          </div>
          <div className="admin-card-info">
            <span className="admin-card-label">Total Realized Revenue</span>
            <span className="admin-card-value">{formatPrice(stats.revenue)}</span>
          </div>
          <Link to="/orders" className="admin-card-link">View Sales Ledger →</Link>
        </div>

        <div className="admin-card">
          <div className="admin-card-head">
            <div className="admin-card-icon gold">
              <OrdersIcon />
            </div>
            <span className="admin-card-badge-pill">{stats.orders} Total</span>
          </div>
          <div className="admin-card-info">
            <span className="admin-card-label">Client Orders</span>
            <span className="admin-card-value">{stats.orders}</span>
          </div>
          <Link to="/orders" className="admin-card-link">Manage Orders →</Link>
        </div>

        <div className="admin-card">
          <div className="admin-card-head">
            <div className="admin-card-icon sage">
              <BagIcon />
            </div>
            <span className="admin-card-badge-pill">{stats.products} Sarees</span>
          </div>
          <div className="admin-card-info">
            <span className="admin-card-label">Curated Catalog</span>
            <span className="admin-card-value">{stats.products}</span>
          </div>
          <Link to="/products" className="admin-card-link">Manage Catalog →</Link>
        </div>

        <div className="admin-card">
          <div className="admin-card-head">
            <div className="admin-card-icon royal">
              <UsersIcon />
            </div>
            <span className="admin-card-badge-pill">{stats.users} Patrons</span>
          </div>
          <div className="admin-card-info">
            <span className="admin-card-label">Registered Patrons</span>
            <span className="admin-card-value">{stats.users}</span>
          </div>
          <Link to="/users" className="admin-card-link">Patron Directory →</Link>
        </div>
      </div>

      <div className="admin-split-grid">
        <section className="admin-panel-card">
          <div className="admin-panel-head">
            <div>
              <h2>Recent Client Orders</h2>
              <p>Latest acquisitions placed across the digital boutique.</p>
            </div>
            <Link to="/orders" className="admin-panel-link">All Orders ({stats.orders}) →</Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="admin-empty-state">
              <OrdersIcon />
              <p>No orders placed yet. Orders will appear here upon checkout.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order Ref</th>
                    <th>Patron</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((ord) => (
                    <tr key={ord._id || ord.id}>
                      <td className="admin-font-mono">
                        {(ord._id || ord.id || "").toString().slice(-8).toUpperCase()}
                      </td>
                      <td>
                        <strong>{ord.customer?.name || "Client"}</strong>
                        <small className="admin-subtext">{ord.customer?.city || "India"}</small>
                      </td>
                      <td>{formatDate(ord.createdAt)}</td>
                      <td className="admin-price-cell">{formatPrice(ord.total)}</td>
                      <td>
                        <span className={`admin-order-badge status-${ord.orderStatus || "pending"}`}>
                          {ord.orderStatus || "pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-panel-card">
          <div className="admin-panel-head">
            <div>
              <h2>Inventory Attention ({lowStockProducts.length})</h2>
              <p>Sarees with 5 or fewer items remaining in the atelier vault.</p>
            </div>
            <Link to="/products" className="admin-panel-link">Manage Stock →</Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="admin-empty-state-green">
              <span>✓ All catalog pieces have sufficient inventory.</span>
            </div>
          ) : (
            <div className="admin-lowstock-list">
              {lowStockProducts.map((p) => {
                const img = (Array.isArray(p.images) && p.images[0]) || p.image || "/images/banner-home.jpg";
                return (
                  <div key={p._id || p.id} className="admin-lowstock-item">
                    <img src={img} alt={p.name} className="admin-lowstock-thumb" />
                    <div className="admin-lowstock-info">
                      <h4>{p.name}</h4>
                      <span className="admin-subtext">{p.category} • {formatPrice(p.price)}</span>
                    </div>
                    <span className="admin-stock-alert">
                      {p.stock === 0 ? "Out of Stock" : `${p.stock} left`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
