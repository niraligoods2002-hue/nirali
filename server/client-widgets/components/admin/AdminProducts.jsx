import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  adminCreateProduct,
  adminFetchProducts,
  adminUpdateProduct,
  adminDeleteProduct,
  uploadProductImage,
} from "../api.js";

const EMPTY_FORM = {
  name: "",
  slug: "",
  category: "",
  collection: "",
  description: "",
  price: "",
  discountPrice: "",
  colors: "",
  colorStock: "",
  stock: "0",
  occasion: "",
  style: "",
  fabric: "",
  blousePiece: "",
  length: "",
  width: "",
  washCare: "",
  sku: "",
  featured: false,
  bestseller: false,
  published: true,
};

const slugify = (value) => value.toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function normalizeProduct(product) {
  return {
    ...product,
    id: product._id || product.id,
    oldPrice: product.discountPrice || product.oldPrice,
    images: product.images || (product.image ? [product.image] : []),
    image: product.images?.[0] || product.image || "",
    colors: product.colors || [],
    colorStock: product.colorStock instanceof Map
      ? Object.fromEntries(product.colorStock)
      : (product.colorStock || {}),
    details: product.details || {},
    stock: Number(product.stock) || 0,
    published: product.published !== false,
  };
}

function parseColorStock(value) {
  return Object.fromEntries(value.split(",").map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const splitAt = entry.lastIndexOf(":");
    return [entry.slice(0, splitAt).trim(), Math.max(0, Number(entry.slice(splitAt + 1)) || 0)];
  }).filter(([color]) => color));
}

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function AdminProducts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageItems, setImageItems] = useState([]);
  const imageItemsRef = useRef([]);
  const [notice, setNotice] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockDrafts, setStockDrafts] = useState({});

  const loadProducts = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await adminFetchProducts();
      setProducts(Array.isArray(data) ? data.map(normalizeProduct) : []);
    } catch (error) {
      setLoadError(error.response?.data?.message || "Could not load products. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      openAdd();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => { imageItemsRef.current = imageItems; }, [imageItems]);
  useEffect(() => () => revokePreviews(imageItemsRef.current), []);

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category).filter(Boolean))].sort(),
    [products]
  );

  const filteredProducts = useMemo(() => products.filter((product) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [product.name, product.slug, product.category, product.collectionName, product.details.sku]
      .some((value) => String(value || "").toLowerCase().includes(term));
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    const matchesStatus = statusFilter === "all"
      || (statusFilter === "published" && product.published)
      || (statusFilter === "draft" && !product.published)
      || (statusFilter === "out-of-stock" && product.stock <= 0);
    return matchesSearch && matchesCategory && matchesStatus;
  }), [products, search, categoryFilter, statusFilter]);

  const revokePreviews = (items) => items.forEach((item) => {
    if (item.preview) URL.revokeObjectURL(item.preview);
  });

  const openAdd = () => {
    setForm({ ...EMPTY_FORM });
    setEditId(null);
    revokePreviews(imageItems);
    setImageItems([]);
    setModal("add");
    setNotice(null);
  };

  const openEdit = (product) => {
    const details = product.details || {};
    setForm({
      ...EMPTY_FORM,
      name: product.name || "",
      slug: product.slug || "",
      category: product.category || "",
      collection: product.collectionName || "",
      description: product.description || "",
      price: product.price?.toString() || "",
      discountPrice: product.discountPrice?.toString() || "",
      colors: (product.colors || []).join(", "),
      colorStock: Object.entries(product.colorStock || {}).map(([color, quantity]) => `${color}:${quantity}`).join(", "),
      stock: String(product.stock ?? 0),
      occasion: product.occasion || "",
      style: product.style || "",
      fabric: details.fabric || "",
      blousePiece: details.blousePiece || details.blouse || "",
      length: details.length || "",
      width: details.width || "",
      washCare: details.washCare || "",
      sku: details.sku || "",
      featured: Boolean(product.featured),
      bestseller: Boolean(product.bestseller),
      published: product.published !== false,
    });
    revokePreviews(imageItems);
    setImageItems((product.images || []).map((url, index) => ({
      key: `existing-${index}-${url}`,
      url,
      existing: true,
    })));
    setEditId(product.id);
    setModal("edit");
    setNotice(null);
  };

  const closeModal = () => {
    revokePreviews(imageItems);
    setModal(null);
    setForm({ ...EMPTY_FORM });
    setEditId(null);
    setImageItems([]);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: type === "checkbox" ? checked : value };
      if (name === "name" && (!current.slug || current.slug === slugify(current.name))) next.slug = slugify(value);
      if (name === "slug") next.slug = slugify(value);
      return next;
    });
  };

  const handleImageChange = (event) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter((file) => file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024);
    if (validFiles.length !== files.length) {
      setNotice({ type: "error", text: "Choose image files no larger than 5 MB each." });
    }
    setImageItems((current) => [...current, ...validFiles.map((file) => ({
      key: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      existing: false,
    }))]);
    event.target.value = "";
  };

  const removeImage = (key) => setImageItems((current) => {
    const removed = current.find((item) => item.key === key);
    if (removed?.preview) URL.revokeObjectURL(removed.preview);
    return current.filter((item) => item.key !== key);
  });

  const makePrimary = (key) => setImageItems((current) => {
    const index = current.findIndex((item) => item.key === key);
    return index <= 0 ? current : [current[index], ...current.slice(0, index), ...current.slice(index + 1)];
  });

  const handleSave = async (event) => {
    event.preventDefault();
    if (!imageItems.length) {
      setNotice({ type: "error", text: "Add at least one product image. The first image is the storefront thumbnail." });
      return;
    }
    if (Number(form.discountPrice) > 0 && Number(form.discountPrice) >= Number(form.price)) {
      setNotice({ type: "error", text: "The discounted price must be lower than the regular price." });
      return;
    }
    if (form.colorStock.split(",").map((entry) => entry.trim()).filter(Boolean).some((entry) => !/^.+:\s*\d+$/.test(entry))) {
      setNotice({ type: "error", text: "Enter stock by colour like ‘Rani Pink: 4, Wine: 2’." });
      return;
    }
    const colorStock = parseColorStock(form.colorStock);
    if (form.colorStock.trim() && Object.keys(colorStock).length === 0) {
      setNotice({ type: "error", text: "Enter stock by colour like ‘Rani Pink: 4, Wine: 2’." });
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const images = await Promise.all(imageItems.map(async (item) => {
        if (item.existing) return item.url;
        const uploaded = await uploadProductImage(item.file);
        return uploaded.url;
      }));
      const payload = {
        name: form.name.trim(),
        slug: slugify(form.slug || form.name),
        category: form.category.trim(),
        collectionName: form.collection.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        discountPrice: form.discountPrice ? Number(form.discountPrice) : undefined,
        images,
        colors: form.colors.split(",").map((value) => value.trim()).filter(Boolean),
        colorStock,
        stock: Object.keys(colorStock).length
          ? Object.values(colorStock).reduce((total, quantity) => total + quantity, 0)
          : Math.max(0, Number(form.stock) || 0),
        occasion: form.occasion.trim(),
        style: form.style.trim(),
        featured: form.featured,
        bestseller: form.bestseller,
        published: form.published,
        details: {
          fabric: form.fabric.trim(),
          blousePiece: form.blousePiece.trim(),
          length: form.length.trim(),
          width: form.width.trim(),
          washCare: form.washCare.trim(),
          sku: form.sku.trim(),
        },
      };
      if (modal === "edit" && editId) {
        await adminUpdateProduct(editId, payload);
        setNotice({ type: "success", text: `${payload.name} has been updated.` });
      } else {
        await adminCreateProduct(payload);
        setNotice({ type: "success", text: `${payload.name} has been added to the catalog.` });
      }
      closeModal();
      await loadProducts();
      setNotice({ type: "success", text: `${payload.name} ${modal === "edit" ? "updated" : "added"} successfully.` });
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.message || error.message || "Could not save this product. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete “${product.name}”? This cannot be undone.`)) return;
    try {
      await adminDeleteProduct(product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setNotice({ type: "success", text: `${product.name} was deleted.` });
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.message || "Could not delete this product. Please try again." });
    }
  };

  const handleStockUpdate = async (product) => {
    const stock = Number(stockDrafts[product.id]);
    if (!Number.isInteger(stock) || stock < 0) {
      setNotice({ type: "error", text: "Stock must be a whole number of zero or more." });
      return;
    }
    try {
      const updated = await adminUpdateProduct(product.id, { stock });
      setProducts((current) => current.map((item) => item.id === product.id
        ? normalizeProduct({ ...item, ...updated, stock }) : item));
      setStockDrafts((current) => { const next = { ...current }; delete next[product.id]; return next; });
      setNotice({ type: "success", text: `Stock updated for ${product.name}.` });
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.message || "Could not update stock." });
    }
  };

  return (
    <div className="admin-page admin-products-page">
      <div className="admin-top-bar">
        <div>
          <span className="admin-eyebrow">NIRALI CATALOG</span>
          <h1>Products</h1>
          <p>{filteredProducts.length} of {products.length} saree{products.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="admin-add-btn" onClick={openAdd}>+ Add Saree</button>
      </div>

      {notice && !modal && <div className={`admin-product-notice ${notice.type}`} role="status">{notice.text}</div>}
      {loadError && <div className="admin-product-notice error" role="alert">{loadError}<button type="button" onClick={loadProducts}>Try again</button></div>}

      <div className="admin-product-toolbar">
        <label className="admin-product-search">Search catalog
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, SKU, category…" />
        </label>
        <label>Category
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label>Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All products</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
            <option value="out-of-stock">Out of stock</option>
          </select>
        </label>
        <button type="button" className="admin-cancel-btn admin-filter-reset" onClick={() => { setSearch(""); setCategoryFilter(""); setStatusFilter("all"); }}>Reset</button>
      </div>

      {loading ? <div className="admin-loading">Loading catalog…</div> : !loadError && (
        <div className="admin-table-wrap">
          <table className="admin-table admin-products-table">
            <thead><tr><th>Saree</th><th>Category / Collection</th><th>Price</th><th>Stock</th><th>Store status</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredProducts.map((product) => {
                const hasColorInventory = Object.keys(product.colorStock || {}).length > 0;
                return (
                <tr key={product.id}>
                  <td><div className="admin-product-identity"><img src={product.image || "/images/products/saree-placeholder.svg"} alt={product.name} className="admin-thumb" /><div><strong>{product.name}</strong><small>{product.details.sku || product.slug}</small></div></div></td>
                  <td>{product.category || "—"}<small className="admin-product-secondary">{product.collectionName || "No collection"}</small></td>
                  <td><strong>{money(product.discountPrice || product.price)}</strong>{product.discountPrice > 0 && <small className="admin-product-secondary admin-price-strike">{money(product.price)}</small>}</td>
                  <td><div className="admin-inline-stock"><input aria-label={`Stock for ${product.name}`} type="number" min="0" step="1" value={stockDrafts[product.id] ?? product.stock} disabled={hasColorInventory} onChange={(event) => setStockDrafts((current) => ({ ...current, [product.id]: event.target.value }))} /><button type="button" className="admin-edit-btn" disabled={hasColorInventory || stockDrafts[product.id] === undefined || Number(stockDrafts[product.id]) === product.stock} onClick={() => handleStockUpdate(product)}>Save</button></div><span className={product.stock > 0 ? "admin-in-stock" : "admin-out-stock"}>{hasColorInventory ? `${product.stock} total · edit colour stock` : product.stock > 0 ? "In stock" : "Out of stock"}</span></td>
                  <td><span className={`admin-product-status ${product.published ? "published" : "draft"}`}>{product.published ? "Published" : "Draft"}</span>{product.featured && <small className="admin-product-secondary">Featured</small>}</td>
                  <td className="admin-table-actions"><button className="admin-edit-btn" onClick={() => openEdit(product)}>Edit</button><button className="admin-delete-btn" onClick={() => handleDelete(product)}>Delete</button></td>
                </tr>
                );
              })}
              {filteredProducts.length === 0 && <tr><td colSpan="6" className="admin-empty-row">{products.length ? "No sarees match these filters." : "No products yet. Add your first saree to start the catalog."}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="admin-overlay" onClick={() => { if (!saving) closeModal(); }}>
          <div className="admin-modal admin-product-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-product-modal-head"><div><span className="admin-eyebrow">SAREE DETAILS</span><h2>{modal === "edit" ? "Edit saree" : "Add a saree"}</h2><p>Fields marked with * are required. The first image is used as the storefront thumbnail.</p></div><button type="button" className="admin-product-close" onClick={closeModal} aria-label="Close product form">×</button></div>
            {notice && <div className={`admin-product-notice ${notice.type}`} role="alert">{notice.text}</div>}
            <form onSubmit={handleSave} className="admin-form admin-product-form">
              <section className="admin-product-form-section">
                <h3>Product information</h3>
                <div className="admin-form-row"><label>Saree name *<input name="name" value={form.name} onChange={handleChange} required maxLength="120" placeholder="e.g. Rani Pink Banarasi Silk Saree" /></label><label>URL slug *<input name="slug" value={form.slug} onChange={handleChange} required pattern="[a-z0-9-]+" title="Use lowercase letters, numbers, and hyphens" placeholder="rani-pink-banarasi-saree" /></label></div>
                <label>Description *<textarea name="description" rows="4" value={form.description} onChange={handleChange} required maxLength="3000" placeholder="Describe the weave, finish, and what makes this saree special." /></label>
                <div className="admin-form-row"><label>Category *<input name="category" list="saree-category-options" value={form.category} onChange={handleChange} required placeholder="e.g. Banarasi Saree" /><datalist id="saree-category-options">{categories.map((category) => <option key={category} value={category} />)}{["Chiffon Saree", "Georgette Saree", "Cotton Saree", "Silk Saree", "Designer Saree", "Printed Saree"].map((category) => <option key={category} value={category} />)}</datalist></label><label>Collection<input name="collection" value={form.collection} onChange={handleChange} placeholder="e.g. Festive Edit" /></label></div>
                <div className="admin-form-row"><label>Occasion<input name="occasion" value={form.occasion} onChange={handleChange} placeholder="Wedding, festive, everyday…" /></label><label>Saree style<input name="style" value={form.style} onChange={handleChange} placeholder="Banarasi, bandhani, embroidered…" /></label></div>
              </section>

              <section className="admin-product-form-section">
                <h3>Price and inventory</h3>
                <div className="admin-form-row"><label>Regular price (₹) *<input name="price" type="number" min="1" step="0.01" value={form.price} onChange={handleChange} required /></label><label>Discounted price (₹)<input name="discountPrice" type="number" min="0" step="0.01" value={form.discountPrice} onChange={handleChange} placeholder="Optional" /></label></div>
                <div className="admin-form-row"><label>SKU<input name="sku" value={form.sku} onChange={handleChange} placeholder="Optional product code" /></label><label>Total stock *<input name="stock" type="number" min="0" step="1" value={form.stock} onChange={handleChange} required /><small className="admin-image-help">If you enter stock per colour below, that total is used instead.</small></label></div>
                <label>Available colours<input name="colors" value={form.colors} onChange={handleChange} placeholder="Rani Pink, Wine, Teal" /><small className="admin-image-help">Separate colours with commas.</small></label>
                <label>Stock by colour<input name="colorStock" value={form.colorStock} onChange={handleChange} placeholder="Rani Pink: 4, Wine: 2" /><small className="admin-image-help">Optional. Enter each colour and quantity; total stock updates automatically.</small></label>
              </section>

              <section className="admin-product-form-section">
                <h3>Fabric and saree details</h3>
                <div className="admin-form-row"><label>Fabric<input name="fabric" value={form.fabric} onChange={handleChange} placeholder="Chiffon, silk, cotton…" /></label><label>Blouse piece<input name="blousePiece" value={form.blousePiece} onChange={handleChange} placeholder="Included, not included, details…" /></label></div>
                <div className="admin-form-row"><label>Saree length<input name="length" value={form.length} onChange={handleChange} placeholder="e.g. 5.5 meters" /></label><label>Width<input name="width" value={form.width} onChange={handleChange} placeholder="e.g. 1.1 meters" /></label></div>
                <label>Care instructions<input name="washCare" value={form.washCare} onChange={handleChange} placeholder="e.g. Dry clean only" /></label>
              </section>

              <section className="admin-product-form-section">
                <h3>Product images</h3>
                <label>Add images<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={handleImageChange} /><small className="admin-image-help">JPEG, PNG, WebP, or AVIF; up to 5 MB per image. Uploading is secure and the first image is the main storefront image.</small></label>
                <div className="admin-image-gallery">
                  {imageItems.map((item, index) => (
                    <div className="admin-image-item" key={item.key}>
                      <img src={item.preview || item.url} alt={`${form.name || "Saree"} image ${index + 1}`} className="admin-image-preview" />
                      <span>{index === 0 ? "Main image" : item.existing ? "Gallery" : "New image"}</span>
                      <div className="admin-image-actions">{index > 0 && <button type="button" onClick={() => makePrimary(item.key)}>Make main</button>}<button type="button" onClick={() => removeImage(item.key)}>Remove</button></div>
                    </div>
                  ))}
                </div>
                {!imageItems.length && <p className="admin-product-image-empty">No images added. Upload the main saree photo and any gallery views.</p>}
              </section>

              <section className="admin-product-form-section">
                <h3>Storefront visibility</h3>
                <div className="admin-checks">
                  <label className="admin-check"><input type="checkbox" name="featured" checked={form.featured} onChange={handleChange} />Feature on storefront</label>
                  <label className="admin-check"><input type="checkbox" name="bestseller" checked={form.bestseller} onChange={handleChange} />Mark as bestseller</label>
                  <label className="admin-check"><input type="checkbox" name="published" checked={form.published} onChange={handleChange} />Published on storefront</label>
                </div>
                <small className="admin-image-help">Draft products stay visible in admin but are hidden from the storefront.</small>
              </section>

                <div className="admin-modal-actions"><button type="button" className="admin-cancel-btn" onClick={closeModal} disabled={saving}>Cancel</button><button type="submit" className="admin-save-btn" disabled={saving}>{saving ? "Saving…" : modal === "edit" ? "Save changes" : "Add saree"}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
