import React, { useState, useEffect } from "react";

export default function ProductCard({ product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    try {
      const wishlist = JSON.parse(
        localStorage.getItem("nirali_wishlist") || "[]"
      );
      setIsWishlisted(wishlist.some((item) => item.id === product.id));
    } catch {
      // safe fallback
    }
  }, [product.id]);

  const displayPrice = product.discountPrice || product.price;
  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const imageSource = imageFailed ? "/images/products/saree1.jpg" : product.image;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.LuxoraCart?.addToCart && window.LuxoraCart.addToCart(product)) {
      setAddedToCart(true);
      window.setTimeout(() => setAddedToCart(false), 2000);
    }
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      let wishlist = JSON.parse(
        localStorage.getItem("nirali_wishlist") || "[]"
      );
      if (isWishlisted) {
        wishlist = wishlist.filter((item) => item.id !== product.id);
        setIsWishlisted(false);
      } else {
        wishlist.push({
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: displayPrice,
          image: imageSource,
          category: product.category,
        });
        setIsWishlisted(true);
      }
      localStorage.setItem("nirali_wishlist", JSON.stringify(wishlist));
      window.dispatchEvent(new CustomEvent("wishlist-updated", { detail: { count: wishlist.length } }));
    } catch {
      // safe fallback
    }
  };

  return (
    <article className="product-card">
      <div className="product-card-media">
        <a href={`/products/${product.slug}`} className="product-card-image-link" aria-label={`View details of ${product.name}`}>
          <img
            src={imageSource}
            alt={product.name}
            className="product-card-img"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        </a>

        {/* Badges */}
        <div className="product-card-badges">
          {product.badge && <span className="product-badge badge-gold">{product.badge}</span>}
          {hasDiscount && (
            <span className="product-badge badge-discount">
              {Math.round(((product.price - product.discountPrice) / product.price) * 100)}% Off
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          className={`product-wishlist-btn ${isWishlisted ? "active" : ""}`}
          onClick={handleToggleWishlist}
          aria-label={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
          title={isWishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill={isWishlisted ? "#e11d48" : "none"} stroke={isWishlisted ? "#e11d48" : "currentColor"} strokeWidth="1.7">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Quick Action Overlay on Desktop */}
        <div className="product-quick-actions">
          <button
            type="button"
            className={`product-add-cart-btn ${addedToCart ? "added" : ""}`}
            onClick={handleAddToCart}
          >
            {addedToCart ? "Added to Bag ✓" : "Add to Bag"}
          </button>
        </div>
      </div>

      <div className="product-card-info">
        <span className="product-card-category">{product.category || "Heritage Saree"}</span>
        <h3 className="product-card-title">
          <a href={`/products/${product.slug}`}>{product.name}</a>
        </h3>

        <div className="product-card-pricing">
          <span className="price-current">₹{Number(displayPrice).toLocaleString("en-IN")}</span>
          {hasDiscount && (
            <span className="price-original">₹{Number(product.price).toLocaleString("en-IN")}</span>
          )}
        </div>
      </div>
    </article>
  );
}
