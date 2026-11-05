import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

function ProductDetail() {
  const root = document.getElementById("product-detail-root");
  const product = JSON.parse(root?.dataset.product || "{}");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || "");
  const [openSection, setOpenSection] = useState("details");
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  const details = product.details || {};
  const colorImages = product.colorImages || {};
  const colorStock = product.colorStock || {};
  const selectedColorStock = selectedColor && Object.hasOwn(colorStock, selectedColor)
    ? Number(colorStock[selectedColor] || 0)
    : Number(product.stock || 0);

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

  useEffect(() => {
    const handleScroll = () => {
      const purchaseRow = document.querySelector(".product-purchase-row");
      if (purchaseRow) {
        const rect = purchaseRow.getBoundingClientRect();
        setScrolledPastHero(rect.bottom < 0);
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const showColorImage = (color) => {
    setSelectedColor(color);
    setQuantity(1);
    const image = colorImages[color];
    const mainImage = document.getElementById("product-main-image");
    if (!image || !mainImage) return;
    mainImage.src = image;
    document.querySelectorAll("[data-product-image]").forEach((button) => {
      button.classList.toggle("active", button.dataset.productImage === image);
    });
  };

  useEffect(() => {
    const handleThumbnailColor = (event) => setSelectedColor(event.detail.color);
    window.addEventListener("product-color-change", handleThumbnailColor);
    return () => window.removeEventListener("product-color-change", handleThumbnailColor);
  }, []);

  const handleAddToCart = () => {
    const cartProduct = { ...product, selectedColor };
    const cartApi = window.NiraliCart || window.LuxoraCart;
    if (cartApi?.addToCart && cartApi.addToCart(cartProduct, quantity)) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  const handleBuyNow = () => {
    const checkoutItem = {
      id: product.id,
      cartId: selectedColor ? `${product.id}:${selectedColor}` : product.id,
      name: product.name,
      slug: product.slug,
      price: product.discountPrice || product.price,
      image: product.image,
      category: product.category,
      color: selectedColor,
      quantity,
    };

    sessionStorage.setItem("nirali_buy_now", JSON.stringify(checkoutItem));
    sessionStorage.removeItem("nirali_buy_now_order_key");
    if (!localStorage.getItem("token")) {
      localStorage.setItem("redirectAfterLogin", "/checkout?mode=buy-now");
      window.location.href = "/login?redirect=%2Fcheckout%3Fmode%3Dbuy-now";
      return;
    }
    window.location.href = "/checkout?mode=buy-now";
  };

  const handleToggleWishlist = () => {
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
          price: product.discountPrice || product.price,
          image: product.image,
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

  const sections = [
    {
      id: "details",
      label: "Specifications & Dimensions",
      content: (
        <dl className="product-spec-grid">
          <div><dt>Length</dt><dd>{details.length || "5.5 meters"}</dd></div>
          <div><dt>Width</dt><dd>{details.width || "1.1 meters"}</dd></div>
          <div><dt>Blouse Piece</dt><dd>{details.blousePiece || "Unstitched 0.8m Included"}</dd></div>
          <div><dt>Fabric</dt><dd>{details.fabric || product.category || "Pure Handloom"}</dd></div>
          <div><dt>Wash Care</dt><dd>{details.washCare || "Professional Dry Clean Recommended"}</dd></div>
          <div><dt>Weave Technique</dt><dd>{details.weave || "Intricate Zari Handloom"}</dd></div>
          <div><dt>Authenticity</dt><dd>100% Genuine Handcrafted in India</dd></div>
          <div><dt>SKU</dt><dd>{details.sku || product.slug?.toUpperCase()}</dd></div>
        </dl>
      ),
    },
    { id: "description", label: "Artisanal Narrative", content: <p className="narrative-text">{product.description}</p> },
    { id: "shipping", label: "Complimentary Delivery & Packaging", content: (
      <div className="policy-block">
        <p>• Complimentary express shipping across India on orders above ₹2,999.</p>
        <p>• Dispatched within 24–48 hours in our signature gilded keepsake box.</p>
        <p>• Real-time SMS & WhatsApp tracking updates provided upon dispatch.</p>
      </div>
    )},
    { id: "returns", label: "5-Day Return & Exchange Promise", content: (
      <div className="policy-block">
        <p>We pride ourselves on unmatched quality. If you wish to exchange or return this piece, you may request a hassle-free pickup within 5 days of delivery.</p>
      </div>
    )},
  ];

  return (
    <div className="product-luxury-interactive">
      
      {/* Color / Variant Swatches */}
      {product.colors?.length > 0 && (
        <div className="product-variant-selector">
          <div className="variant-header">
            <span className="variant-label">Colorway:</span>
            <strong className="variant-value">{selectedColor}</strong>
            <span className="variant-stock-status">
              {selectedColorStock > 0 ? `(${selectedColorStock} available)` : "(Sold out)"}
            </span>
          </div>

          <div className="variant-swatch-list">
            {product.colors.map((color) => {
              const isOutOfStock = Object.hasOwn(colorStock, color) && Number(colorStock[color]) <= 0;
              return (
                <button
                  type="button"
                  key={color}
                  className={[
                    "variant-swatch-btn",
                    selectedColor === color ? "active" : "",
                    isOutOfStock ? "out-of-stock" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => showColorImage(color)}
                  aria-pressed={selectedColor === color}
                  aria-label={`Select ${color}`}
                >
                  <span>{color}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Row: Quantity + Add to Bag + Buy Now + Wishlist */}
      <div className="product-purchase-row">
        <div className="quantity-stepper">
          <button
            type="button"
            className="stepper-btn"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            &minus;
          </button>
          <span className="stepper-value">{quantity}</span>
          <button
            type="button"
            className="stepper-btn"
            aria-label="Increase quantity"
            onClick={() => setQuantity((q) => Math.min(selectedColorStock, q + 1))}
            disabled={quantity >= selectedColorStock}
          >
            &#43;
          </button>
        </div>

        <button
          type="button"
          className="btn-primary product-add-bag-btn"
          onClick={handleAddToCart}
          disabled={added || selectedColorStock <= 0}
        >
          {selectedColorStock <= 0 ? "Currently Unavailable" : added ? "Added to Bag ✓" : "Add to Bag"}
        </button>

        <button
          type="button"
          className="btn-secondary product-buy-now-btn"
          onClick={handleBuyNow}
          disabled={selectedColorStock <= 0}
        >
          Buy Now
        </button>

        <button
          type="button"
          className={`product-wishlist-toggle ${isWishlisted ? "active" : ""}`}
          onClick={handleToggleWishlist}
          aria-label={isWishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
          title={isWishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* Luxury Trust Indicators */}
      <div className="product-trust-strip">
        <div className="trust-card">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span>Dispatch in 24h</span>
        </div>
        <div className="trust-card">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          <span>Authentic Handloom</span>
        </div>
        <div className="trust-card">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          <span>5-Day Returns</span>
        </div>
      </div>

      {/* Accordions */}
      <div className="product-editorial-accordions">
        {sections.map((sec) => (
          <div className="accordion-item" key={sec.id}>
            <button
              type="button"
              className="accordion-trigger"
              onClick={() => setOpenSection(openSection === sec.id ? "" : sec.id)}
              aria-expanded={openSection === sec.id}
            >
              <span className="accordion-title">{sec.label}</span>
              <span className="accordion-icon">{openSection === sec.id ? "−" : "+"}</span>
            </button>
            {openSection === sec.id && (
              <div className="accordion-panel">{sec.content}</div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile Sticky Bottom Conversion Bar */}
      <div className={`pdp-mobile-sticky-bar ${scrolledPastHero ? "visible" : ""}`}>
        <div className="pdp-sticky-product-info">
          <img src={colorImages[selectedColor] || product.image || "/images/products/saree-placeholder.svg"} alt={product.name} className="pdp-sticky-thumb" />
          <div className="pdp-sticky-meta">
            <span className="pdp-sticky-title">{product.name}</span>
            <span className="pdp-sticky-price">₹{Number(product.discountPrice || product.price).toLocaleString("en-IN")}</span>
          </div>
        </div>
        <div className="pdp-sticky-actions">
          <button
            type="button"
            className="btn-primary pdp-sticky-btn"
            onClick={handleAddToCart}
            disabled={added || selectedColorStock <= 0}
          >
            {added ? "Added ✓" : "Add to Bag"}
          </button>
        </div>
      </div>

    </div>
  );
}

const root = document.getElementById("product-detail-root");
if (root) createRoot(root).render(<ProductDetail />);

// Thumbnail gallery interaction
const mainProductImage = document.getElementById("product-main-image");
const productData = JSON.parse(document.getElementById("product-detail-root")?.dataset.product || "{}");
document.querySelectorAll("[data-product-image]").forEach((thumbnail) => {
  thumbnail.addEventListener("click", () => {
    if (!mainProductImage) return;
    mainProductImage.src = thumbnail.dataset.productImage;
    document.querySelectorAll("[data-product-image]").forEach((button) => button.classList.remove("active"));
    thumbnail.classList.add("active");
    const selectedColor = Object.entries(productData.colorImages || {})
      .find(([, image]) => image === thumbnail.dataset.productImage)?.[0];
    if (selectedColor) {
      window.dispatchEvent(new CustomEvent("product-color-change", { detail: { color: selectedColor } }));
    }
  });
});
