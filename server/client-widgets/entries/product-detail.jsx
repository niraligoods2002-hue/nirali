import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

function ProductDetail() {
  const root = document.getElementById("product-detail-root");
  const product = JSON.parse(root?.dataset.product || "{}");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || "");
  const [openSection, setOpenSection] = useState("details");
  const details = product.details || {};
  const colorImages = product.colorImages || {};

  const showColorImage = (color) => {
    setSelectedColor(color);
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
    if (window.LuxoraCart?.addToCart && window.LuxoraCart.addToCart(cartProduct, quantity)) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  };

  const sections = [
    {
      id: "details",
      label: "Details",
      content: (
        <dl className="product-detail-list">
          <div><dt>Length</dt><dd>{details.length || "5.5 m"}</dd></div>
          <div><dt>Width</dt><dd>{details.width || "1.1 m"}</dd></div>
          <div><dt>Blouse Piece</dt><dd>{details.blousePiece || "Included"}</dd></div>
          <div><dt>Blouse</dt><dd>{details.blouse || "The model may be wearing a styled blouse for photography."}</dd></div>
          <div><dt>Wash Care</dt><dd>{details.washCare || "Dry clean only"}</dd></div>
          <div><dt>Fabric</dt><dd>{details.fabric || product.category}</dd></div>
          <div><dt>Disclaimer</dt><dd>{details.disclaimer || "Colours may vary slightly because of lighting and screen settings."}</dd></div>
          <div><dt>What You Will Receive</dt><dd>{details.contents || "1 Saree"}</dd></div>
          <div><dt>SKU</dt><dd>{details.sku || product.slug?.toUpperCase()}</dd></div>
        </dl>
      ),
    },
    { id: "description", label: "Description", content: <p>{product.description}</p> },
    { id: "manufacturing", label: "Manufacturing Information", content: <p>{details.manufacturing || "Designed and packed in India."}</p> },
    { id: "returns", label: "Return & Exchange Policy", content: <p>{details.returnPolicy || "Easy returns within 5 days of delivery."}</p> },
    { id: "delivery", label: "Delivery", content: <p>{details.delivery || "Dispatched within 3-5 business days."}</p> },
  ];

  return (
    <>
      {product.colors?.length > 0 && (
        <div className="product-color-options">
          <span>Color: <strong>{selectedColor}</strong></span>
          <div className="product-color-list">
            {product.colors.map((color) => (
              <button
                type="button"
                key={color}
                className={selectedColor === color ? "active" : ""}
                onClick={() => showColorImage(color)}
                aria-pressed={selectedColor === color}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="product-actions">
        <div className="quantity-selector">
          <button aria-label="Decrease quantity" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>-</button>
          <span>{quantity}</span>
          <button aria-label="Increase quantity" onClick={() => setQuantity((q) => q + 1)}>+</button>
        </div>
        <button className="btn-primary add-to-cart-btn" onClick={handleAddToCart} disabled={added}>
          {added ? "Added to Cart" : "Add to Cart"}
        </button>
      </div>

      <div className="product-accordions">
        {sections.map((section) => (
          <section className="product-accordion" key={section.id}>
            <button type="button" onClick={() => setOpenSection(openSection === section.id ? "" : section.id)}>
              {section.label}
              <span>{openSection === section.id ? "-" : "+"}</span>
            </button>
            {openSection === section.id && <div className="product-accordion-content">{section.content}</div>}
          </section>
        ))}
      </div>
    </>
  );
}

const root = document.getElementById("product-detail-root");
if (root) createRoot(root).render(<ProductDetail />);

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
