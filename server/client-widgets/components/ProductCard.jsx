import React, { useState } from "react";

export default function ProductCard({ product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const displayPrice = product.discountPrice || product.price;
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const imageSource = imageFailed ? "/images/products/saree1.jpg" : product.image;

  const handleAddToCart = () => {
    if (window.LuxoraCart?.addToCart && window.LuxoraCart.addToCart(product)) {
      setAddedToCart(true);
      window.setTimeout(() => setAddedToCart(false), 1800);
    }
  };

  return (
    <article className="product-card">
      <a href={`/products/${product.slug}`} className="product-card-link" aria-label={`View ${product.name}`}>
        <div className="product-card-image">
          <img
            src={imageSource}
            alt={product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
          {product.badge && <span className="product-card-badge">{product.badge}</span>}
          <span className="product-card-view">
            View details
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
        <div className="product-card-body">
          <div className="product-card-meta">
            <span className="product-card-category">{product.category}</span>
            <span className="product-card-rating">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {product.rating || 5}
            </span>
          </div>
          <h3 className="product-card-title">{product.name}</h3>
          <div className="product-card-price">
            ₹{displayPrice.toLocaleString("en-IN")}
            {hasDiscount && <span className="old">₹{product.price.toLocaleString("en-IN")}</span>}
          </div>
        </div>
      </a>
      <div className="product-card-actions">
        <button type="button" className={`product-add-cart${addedToCart ? " added" : ""}`} onClick={handleAddToCart}>
          {addedToCart ? "Added to Cart ✓" : "Add to Cart"}
        </button>
      </div>
    </article>
  );
}
