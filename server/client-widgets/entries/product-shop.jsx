import React, { useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import ProductCard from "../components/ProductCard.jsx";

function ProductShop() {
  const root = document.getElementById("shop-root");
  const products = JSON.parse(root?.dataset.products || "[]");
  const initialFilter = root?.dataset.filter || "";
  const initialSearch = (root?.dataset.search || "").trim();

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortBy, setSortBy] = useState("curated");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [products]
  );

  const normalizedInitialFilter = useMemo(() => {
    if (["featured", "new", "bestseller", ""].includes(initialFilter)) return initialFilter;
    if (initialFilter.startsWith("category:")) return initialFilter;
    if (categories.includes(initialFilter)) return `category:${initialFilter}`;
    return initialFilter;
  }, [initialFilter, categories]);

  const [filter, setFilter] = useState(normalizedInitialFilter);

  // Active Category Name (for title/breadcrumbs)
  const currentCategoryName = useMemo(() => {
    if (filter.startsWith("category:")) return filter.slice("category:".length);
    if (filter === "new") return "New Arrivals";
    if (filter === "bestseller") return "Best Sellers";
    if (filter === "featured") return "Featured Masterpieces";
    return "";
  }, [filter]);

  // Filter & Sort Logic
  const filteredAndSorted = useMemo(() => {
    let result = [...products];

    // Filter
    if (filter === "new") {
      result = result.filter((p) => p.newArrival);
    } else if (filter === "bestseller") {
      result = result.filter((p) => p.bestseller);
    } else if (filter === "featured") {
      result = result.filter((p) => p.featured);
    } else if (filter.startsWith("category:")) {
      const cat = filter.slice("category:".length);
      result = result.filter((p) => p.category === cat);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) =>
        [p.name, p.category, p.description].filter(Boolean).some((val) => val.toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortBy === "price-asc") {
      result.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
    } else if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return result;
  }, [products, filter, searchQuery, sortBy]);

  const filterTabs = [
    { key: "", label: "All Sarees" },
    { key: "new", label: "New Arrivals" },
    { key: "bestseller", label: "Best Sellers" },
    { key: "featured", label: "Masterpieces" },
    ...categories.map((c) => ({ key: `category:${c}`, label: c })),
  ];

  const clearAllFilters = () => {
    setFilter("");
    setSearchQuery("");
    setSortBy("curated");
    if (window.history?.pushState) {
      window.history.pushState({}, "", "/shop");
    }
  };

  return (
    <div className="luxury-shop-wrapper">
      
      {/* Editorial Header & Breadcrumbs */}
      <nav className="breadcrumbs" aria-label="Breadcrumbs">
        <a href="/">Home</a>
        <span className="separator">/</span>
        <a href="/shop">Shop</a>
        {currentCategoryName && (
          <>
            <span className="separator">/</span>
            <span className="current">{currentCategoryName}</span>
          </>
        )}
      </nav>

      <div className="shop-editorial-header">
        <div className="shop-title-block">
          <span className="section-eyebrow">THE NIRALI ARCHIVE</span>
          <h1 className="shop-page-title">
            {currentCategoryName ? currentCategoryName : "All Handcrafted Sarees"}
          </h1>
          <p className="shop-page-sub">
            {currentCategoryName
              ? `Discover masterfully curated ${currentCategoryName.toLowerCase()} crafted for discerning celebrations.`
              : "Explore our complete repertoire of timeless handlooms, gossamer chiffons, and heirloom zari weaves."}
          </p>
        </div>

        <div className="shop-meta-counter">
          <span className="count-number">{filteredAndSorted.length}</span>
          <span className="count-label">Curations Available</span>
        </div>
      </div>

      {/* Active Search Notification */}
      {searchQuery && (
        <div className="shop-search-banner">
          <p>
            Showing results matching <strong>“{searchQuery}”</strong> ({filteredAndSorted.length} found)
          </p>
          <button type="button" className="clear-search-btn" onClick={() => setSearchQuery("")}>
            Clear Search &times;
          </button>
        </div>
      )}

      {/* Controls Bar: Category Filter Chips + Sort Dropdown */}
      <div className="shop-controls-bar">
        {/* Desktop Filter Chips */}
        <div className="shop-filter-chips" role="tablist">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={filter === tab.key}
              className={`filter-chip ${filter === tab.key ? "active" : ""}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Utility Row: Mobile Filter Trigger & Sort Select */}
        <div className="shop-utility-row">
          <button
            type="button"
            className="mobile-filter-trigger"
            onClick={() => setMobileFilterOpen(true)}
            aria-label="Open Filters"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="21" x2="4" y2="14"></line>
              <line x1="4" y1="10" x2="4" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12" y2="3"></line>
              <line x1="20" y1="21" x2="20" y2="16"></line>
              <line x1="20" y1="12" x2="20" y2="3"></line>
              <line x1="1" y1="14" x2="7" y2="14"></line>
              <line x1="9" y1="8" x2="15" y2="8"></line>
              <line x1="17" y1="16" x2="23" y2="16"></line>
            </svg>
            <span>Filters ({filter ? "1" : "All"})</span>
          </button>

          <div className="shop-sort-dropdown">
            <label htmlFor="shop-sort-select" className="sort-label">Sort by:</label>
            <select
              id="shop-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="curated">Curator’s Pick</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newest Additions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFilterOpen && (
        <div className="mobile-filter-drawer-backdrop" onClick={() => setMobileFilterOpen(false)}>
          <div className="mobile-filter-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Refine Collection</h3>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setMobileFilterOpen(false)}
                aria-label="Close filters"
              >
                &times;
              </button>
            </div>

            <div className="drawer-body">
              <h4 className="drawer-section-title">Categories</h4>
              <div className="drawer-filter-list">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`drawer-filter-item ${filter === tab.key ? "active" : ""}`}
                    onClick={() => {
                      setFilter(tab.key);
                      setMobileFilterOpen(false);
                    }}
                  >
                    <span>{tab.label}</span>
                    {filter === tab.key && <span className="check">&check;</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="drawer-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  clearAllFilters();
                  setMobileFilterOpen(false);
                }}
              >
                Reset All
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setMobileFilterOpen(false)}
              >
                View ({filteredAndSorted.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Responsive Product Grid */}
      {filteredAndSorted.length > 0 ? (
        <div className="shop-editorial-grid">
          {filteredAndSorted.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="shop-empty-luxury">
          <div className="empty-state-icon-wrap">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </div>
          <h3>No matching curations found</h3>
          <p>
            We could not find any sarees matching your selected criteria. Try resetting the filters or exploring our classic collections.
          </p>
          <div className="empty-actions">
            <button type="button" className="btn-primary" onClick={clearAllFilters}>
              Reset All Filters
            </button>
            <a href="/shop" className="btn-secondary">
              Browse Entire Collection
            </a>
          </div>
        </div>
      )}

    </div>
  );
}

const root = document.getElementById("shop-root");
if (root) {
  createRoot(root).render(<ProductShop />);
}
