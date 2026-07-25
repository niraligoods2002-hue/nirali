import React, { useRef } from "react";
import { createRoot } from "react-dom/client";
import ProductCard from "../components/ProductCard.jsx";

function FeaturedProducts() {
  const root = document.getElementById("featured-products-root");
  const products = JSON.parse(root?.dataset.products || "[]");
  const rowRefs = useRef({});

  if (!products.length) {
    return <p style={{ color: "#888", textAlign: "center" }}>No products available yet.</p>;
  }

  const categories = products.reduce((groups, product) => {
    const category = product.category || "Other Sarees";
    groups[category] = [...(groups[category] || []), product];
    return groups;
  }, {});

  const scrollRow = (category, direction) => {
    rowRefs.current[category]?.scrollBy({
      left: direction * 340,
      behavior: "smooth",
    });
  };

  return (
    <div className="category-list">
      {Object.entries(categories).map(([category, categoryProducts]) => (
        <section className="category-row" key={category}>
          <div className="category-row-header">
            <div>
              <h3>{category}</h3>
              <p>{categoryProducts.length} style{categoryProducts.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="category-row-controls">
              <button type="button" onClick={() => scrollRow(category, -1)} aria-label={`Scroll ${category} left`}>
                ←
              </button>
              <button type="button" onClick={() => scrollRow(category, 1)} aria-label={`Scroll ${category} right`}>
                →
              </button>
            </div>
          </div>
          <div className="category-product-track" ref={(element) => { rowRefs.current[category] = element; }}>
            {categoryProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

const root = document.getElementById("featured-products-root");
if (root) {
  createRoot(root).render(<FeaturedProducts />);
}
