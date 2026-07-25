import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { adminCreateProduct, adminUpdateProduct, adminDeleteProduct, uploadProductImage } from "../api.js";

const EMPTY_FORM = {
  name: "",
  slug: "",
  category: "",
  description: "",
  price: "",
  discountPrice: "",
  images: "",
  stock: "",
  featured: false,
  bestseller: false,
};

function normalizeProduct(p) {
  return {
    id: p._id || p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    price: p.price,
    oldPrice: p.discountPrice || p.oldPrice,
    description: p.description,
    images: p.images || [p.image],
    image: p.images?.[0] || p.image,
    stock: p.stock || 0,
    featured: p.featured,
    bestseller: p.bestseller,
  };
}

export default function AdminProducts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(Array.isArray(data) ? data.map(normalizeProduct) : []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      openAdd();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setImageFiles([]);
    setImagePreviews([]);
    setModal("add");
  };

  const openEdit = (p) => {
    setForm({
      name: p.name || "",
      slug: p.slug || "",
      category: p.category || "",
      description: p.description || "",
      price: p.price?.toString() || "",
      discountPrice: p.oldPrice?.toString() || "",
      images: (p.images || []).join(", "),
      stock: p.stock?.toString() || "0",
      featured: p.featured || false,
      bestseller: p.bestseller || false,
    });
    setEditId(p.id);
    setImageFiles([]);
    setImagePreviews([]);
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setForm(EMPTY_FORM);
    setEditId(null);
    setImageFiles([]);
    setImagePreviews([]);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    setImageFiles(files);
    setImagePreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const removeExistingImage = (url) => {
    const images = form.images.split(",").map((value) => value.trim()).filter(Boolean);
    setForm({ ...form, images: images.filter((image) => image !== url).join(", ") });
  };

  const removeNewImage = (index) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles((files) => files.filter((_, fileIndex) => fileIndex !== index));
    setImagePreviews((previews) => previews.filter((_, previewIndex) => previewIndex !== index));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const existingImages = form.images.split(",").map((value) => value.trim()).filter(Boolean);
    if (modal === "add" && !imageFiles.length && !existingImages.length) {
      alert("Please select at least one product image");
      return;
    }
    setSaving(true);

    try {
      let images = existingImages;
      if (imageFiles.length) {
        const uploadedImages = await Promise.all(imageFiles.map((file) => uploadProductImage(file)));
        images = [...images, ...uploadedImages.map((image) => image.url)];
      }

      const payload = {
        name: form.name,
        slug: form.slug,
        category: form.category,
        description: form.description,
        price: Number(form.price),
        discountPrice: form.discountPrice ? Number(form.discountPrice) : undefined,
        images,
        stock: Number(form.stock) || 0,
        featured: form.featured,
        bestseller: form.bestseller,
      };

      if (modal === "edit" && editId) {
        await adminUpdateProduct(editId, payload);
        alert("Product updated");
      } else {
        await adminCreateProduct(payload);
        alert("Product created");
      }
      closeModal();
      loadProducts();
    } catch (err) {
      // Error handled by interceptor
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await adminDeleteProduct(id);
      alert("Product deleted");
      loadProducts();
    } catch {
      // Error handled by interceptor
    }
  };

  if (loading) {
    return <div className="admin-loading">Loading products...</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-top-bar">
        <div>
          <h1>Products</h1>
          <p>{products.length} product{products.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="admin-add-btn" onClick={openAdd}>+ Add Product</button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <img src={p.image} alt={p.name} className="admin-thumb" />
                </td>
                <td className="admin-name-cell">{p.name}</td>
                <td>{p.category}</td>
                <td>₹{p.price?.toLocaleString()}</td>
                <td>
                  <span className={p.stock > 0 ? "admin-in-stock" : "admin-out-stock"}>
                    {p.stock}
                  </span>
                </td>
                <td className="admin-table-actions">
                  <button className="admin-edit-btn" onClick={() => openEdit(p)}>Edit</button>
                  <button className="admin-delete-btn" onClick={() => handleDelete(p.id, p.name)}>Delete</button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan="6" className="admin-empty-row">
                  No products yet. Click "Add Product" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="admin-overlay" onClick={closeModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal === "edit" ? "Edit Product" : "Add Product"}</h2>
            <form onSubmit={handleSave} className="admin-form">
              <div className="admin-form-row">
                <label>
                  Name
                  <input name="name" value={form.name} onChange={handleChange} required />
                </label>
                <label>
                  Slug
                  <input name="slug" value={form.slug} onChange={handleChange} required />
                </label>
              </div>
              <div className="admin-form-row">
                <label>
                  Category
                  <input name="category" value={form.category} onChange={handleChange} required />
                </label>
                <label>
                  Stock
                  <input name="stock" type="number" value={form.stock} onChange={handleChange} />
                </label>
              </div>
              <label>
                Description
                <textarea name="description" rows="3" value={form.description} onChange={handleChange} required />
              </label>
              <div className="admin-form-row">
                <label>
                  Price (₹)
                  <input name="price" type="number" value={form.price} onChange={handleChange} required />
                </label>
                <label>
                  Discount Price (₹)
                  <input name="discountPrice" type="number" value={form.discountPrice} onChange={handleChange} />
                </label>
              </div>
              <label>
                Product images
                <input name="productImages" type="file" accept="image/*" multiple onChange={handleImageChange} />
              </label>
              <small className="admin-image-help">Select one or more images. The first image is used on product cards.</small>
              <div className="admin-image-gallery">
                {form.images.split(",").map((value) => value.trim()).filter(Boolean).map((url, index) => (
                  <div className="admin-image-item" key={url}>
                    <img src={url} alt={`Existing product ${index + 1}`} className="admin-image-preview" />
                    {index === 0 && <span>Primary</span>}
                    <button type="button" onClick={() => removeExistingImage(url)}>Remove</button>
                  </div>
                ))}
                {imagePreviews.map((url, index) => (
                  <div className="admin-image-item" key={url}>
                    <img src={url} alt={`New product ${index + 1}`} className="admin-image-preview" />
                    <span>New</span>
                    <button type="button" onClick={() => removeNewImage(index)}>Remove</button>
                  </div>
                ))}
              </div>
              <div className="admin-checks">
                <label className="admin-check">
                  <input type="checkbox" name="featured" checked={form.featured} onChange={handleChange} />
                  Featured
                </label>
                <label className="admin-check">
                  <input type="checkbox" name="bestseller" checked={form.bestseller} onChange={handleChange} />
                  Best Seller
                </label>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="admin-cancel-btn" onClick={closeModal}>Cancel</button>
                <button type="submit" className="admin-save-btn" disabled={saving}>
                  {saving ? "Saving..." : modal === "edit" ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
