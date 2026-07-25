import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchAllOrders, fetchAllReviews, fetchAllUsers } from "../api.js";

const BagIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const TrendingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
  </svg>
);

const OrdersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2.25 4.5H6.75A2.25 2.25 0 014.5 18.25V5.75A2.25 2.25 0 016.75 3.5h7.5L19.5 8.75v9.5a2.25 2.25 0 01-2.25 2.25z" />
  </svg>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, orders: 0, reviews: 0, users: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetchAllOrders().catch(() => ({ orders: [] })),
      fetchAllReviews().catch(() => ({ reviews: [] })),
      fetchAllUsers().catch(() => ({ users: [] })),
    ])
      .then(([products, ordersData, reviewsData, usersData]) => {
        setStats({
          products: Array.isArray(products) ? products.length : 0,
          orders: ordersData.orders?.length || 0,
          reviews: reviewsData.reviews?.length || 0,
          users: usersData.users?.length || 0,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="admin-loading">Loading dashboard...</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's an overview of your store.</p>
      </div>

      <div className="admin-cards">
        <div className="admin-card">
          <div className="admin-card-icon" style={{ background: "rgba(212, 175, 55, 0.12)", color: "#d4af37" }}>
            <BagIcon />
          </div>
          <div className="admin-card-info">
            <span className="admin-card-label">Total Products</span>
            <span className="admin-card-value">{stats.products}</span>
          </div>
          <Link to="/products" className="admin-card-link">Manage →</Link>
        </div>

        <div className="admin-card">
          <div className="admin-card-icon" style={{ background: "rgba(212, 175, 55, 0.12)", color: "#d4af37" }}>
            <OrdersIcon />
          </div>
          <div className="admin-card-info">
            <span className="admin-card-label">Total Orders</span>
            <span className="admin-card-value">{stats.orders}</span>
          </div>
          <Link to="/orders" className="admin-card-link">Manage →</Link>
        </div>

        <div className="admin-card">
          <div className="admin-card-icon" style={{ background: "rgba(117, 195, 197, 0.12)", color: "#75c3c5" }}>
            <TrendingIcon />
          </div>
          <div className="admin-card-info">
            <span className="admin-card-label">Total Reviews</span>
            <span className="admin-card-value">{stats.reviews}</span>
          </div>
          <Link to="/reviews" className="admin-card-link">Manage →</Link>
        </div>

        <div className="admin-card">
          <div className="admin-card-icon" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6" }}>
            <UsersIcon />
          </div>
          <div className="admin-card-info">
            <span className="admin-card-label">Total Users</span>
            <span className="admin-card-value">{stats.users}</span>
          </div>
          <Link to="/users" className="admin-card-link">Manage →</Link>
        </div>

        <div className="admin-card">
          <div className="admin-card-icon" style={{ background: "rgba(34, 197, 94, 0.12)", color: "#22c55e" }}>
            <TrendingIcon />
          </div>
          <div className="admin-card-info">
            <span className="admin-card-label">Revenue</span>
            <span className="admin-card-value" style={{ fontSize: "20px" }}>Coming Soon</span>
          </div>
          <span className="admin-card-link-muted">View Report</span>
        </div>
      </div>

      <div className="admin-quick-actions">
        <h2>Quick Actions</h2>
        <div className="admin-actions">
          <Link to="/products?create=1" className="admin-action-btn">+ Add New Product</Link>
          <Link to="/orders" className="admin-action-btn">Manage Orders</Link>
          <Link to="/reviews" className="admin-action-btn">Manage Reviews</Link>
          <Link to="/users" className="admin-action-btn">Manage Users</Link>
          <a href="/" className="admin-action-btn-secondary">View Store</a>
        </div>
      </div>
    </div>
  );
}
