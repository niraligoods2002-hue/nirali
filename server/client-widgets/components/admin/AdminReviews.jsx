import React, { useEffect, useState } from "react";
import { deleteReview, fetchAllReviews, updateReviewStatus } from "../api.js";

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";
}

function Stars({ rating }) {
  return (
    <span className="admin-review-stars">
      {"★".repeat(Number(rating) || 0)}
      {"☆".repeat(5 - (Number(rating) || 0))}
    </span>
  );
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await fetchAllReviews();
      setReviews(data.reviews || []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const toggleStatus = async (review) => {
    const nextStatus = review.status === "approved" ? "hidden" : "approved";
    try {
      const data = await updateReviewStatus(review.id, nextStatus);
      setReviews((current) =>
        current.map((item) => (item.id === review.id ? data.review : item))
      );
    } catch {
      // API helper already alerts.
    }
  };

  const removeReview = async (review) => {
    if (!window.confirm(`Delete review from ${review.name}?`)) return;

    try {
      await deleteReview(review.id);
      setReviews((current) => current.filter((item) => item.id !== review.id));
    } catch {
      // API helper already alerts.
    }
  };

  if (loading) {
    return <div className="admin-loading">Loading reviews...</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-top-bar">
        <div>
          <h1>Reviews</h1>
          <p>{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="admin-empty-panel">No customer reviews yet.</div>
      ) : (
        <div className="admin-review-list">
          {reviews.map((review) => (
            <article className="admin-review-card" key={review.id}>
              <div className="admin-review-head">
                <div>
                  <h2>{review.name}</h2>
                  <p>{review.email} · {formatDate(review.createdAt)}</p>
                </div>
                <span className={`admin-order-badge status-${review.status}`}>
                  {review.status}
                </span>
              </div>
              <Stars rating={review.rating} />
              <p className="admin-review-text">"{review.text}"</p>
              <div className="admin-table-actions">
                <button className="admin-toggle-btn" onClick={() => toggleStatus(review)}>
                  {review.status === "approved" ? "Hide" : "Approve"}
                </button>
                <button className="admin-delete-btn" onClick={() => removeReview(review)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
