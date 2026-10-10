import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import ProductCard from "../components/ProductCard.jsx";

function FeaturedProducts() {
  const root = document.getElementById("featured-products-root");
  const products = JSON.parse(root?.dataset.products || "[]");
  const rowRefs = useRef({});

  if (!products.length) {
    return (
      <div className="empty-state">
        <h3>New Curations Arriving Soon</h3>
        <p>Our master weavers are preparing the upcoming collection.</p>
        <a href="/shop" className="btn-primary">Browse Catalogue</a>
      </div>
    );
  }

  // Extract categories
  const categories = products.reduce((groups, product) => {
    const category = product.category || "Heritage Sarees";
    groups[category] = [...(groups[category] || []), product];
    return groups;
  }, {});

  const scrollRow = (category, direction) => {
    rowRefs.current[category]?.scrollBy({
      left: direction * 360,
      behavior: "smooth",
    });
  };

  return (
    <div className="featured-categories-stream">
      {Object.entries(categories).map(([category, categoryProducts]) => (
        <section className="category-collection-row" key={category}>
          <div className="collection-row-header">
            <div className="collection-row-title-block">
              <span className="section-eyebrow">CURATED EDIT</span>
              <h3 className="collection-row-heading">{category}</h3>
              <p className="collection-row-count">
                {categoryProducts.length} handcrafted piece{categoryProducts.length !== 1 ? "s" : ""}
              </p>
            </div>
            
            <div className="collection-row-nav">
              <a href={`/shop?filter=${encodeURIComponent(`category:${category}`)}`} className="btn-text-link view-category-link">
                View All {category} &rarr;
              </a>
              <div className="carousel-arrows">
                <button
                  type="button"
                  className="carousel-btn"
                  onClick={() => scrollRow(category, -1)}
                  aria-label={`Scroll ${category} left`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <button
                  type="button"
                  className="carousel-btn"
                  onClick={() => scrollRow(category, 1)}
                  aria-label={`Scroll ${category} right`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div
            className="collection-product-track"
            ref={(element) => {
              rowRefs.current[category] = element;
            }}
          >
            {categoryProducts.map((product) => (
              <div className="track-card-wrapper" key={product.id}>
                <ProductCard product={product} />
              </div>
            ))}
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
