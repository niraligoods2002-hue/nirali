import React, { useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import ProductCard from "../components/ProductCard.jsx";

function ProductShop() {
  const root = document.getElementById("shop-root");
  const products = JSON.parse(root?.dataset.products || "[]");
  const initialFilter = root?.dataset.filter || "";
  const searchQuery = (root?.dataset.search || "").trim().toLowerCase();

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b)),
    [products]
  );
  const normalizedInitialFilter = useMemo(() => {
    if (["featured", "new", "bestseller", ""].includes(initialFilter)) return initialFilter;
    if (initialFilter.startsWith("category:")) return initialFilter;
    if (categories.includes(initialFilter)) return `category:${initialFilter}`;
    return initialFilter;
  }, [initialFilter, categories]);

  const [filter, setFilter] = useState(normalizedInitialFilter);

  const filtered = useMemo(() => {
    let visibleProducts = products;
    if (filter === "new") visibleProducts = products.filter((p) => p.newArrival);
    else if (filter === "bestseller") visibleProducts = products.filter((p) => p.bestseller);
    else if (filter === "featured") visibleProducts = products.filter((p) => p.featured);
    else if (filter.startsWith("category:")) {
      visibleProducts = products.filter((p) => p.category === filter.slice("category:".length));
    } else if (categories.includes(filter)) {
      visibleProducts = products.filter((p) => p.category === filter);
    }

    if (!searchQuery) return visibleProducts;
    return visibleProducts.filter((product) =>
      [product.name, product.category, product.description]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(searchQuery))
    );
  }, [products, filter, categories, searchQuery]);

  const filters = [
    { key: "", label: "All" },
    { key: "featured", label: "Featured" },
    { key: "new", label: "New Arrivals" },
    { key: "bestseller", label: "Best Sellers" },
    ...categories.map((category) => ({ key: `category:${category}`, label: category })),
  ];

  return (
    <>
      {searchQuery && (
        <div className="shop-search-result">
          <p>Search results for <strong>“{root?.dataset.search}”</strong></p>
          <a href="/shop" className="shop-clear-search">Clear search</a>
        </div>
      )}
      <div className="shop-filters">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`filter-btn ${filter === f.key ? "active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="shop-grid">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="shop-empty">
          <h2>No products found</h2>
          <p>Try a different filter or check back later.</p>
        </div>
      )}
    </>
  );
}

const root = document.getElementById("shop-root");
if (root) {
  createRoot(root).render(<ProductShop />);
}
