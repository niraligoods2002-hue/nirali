import React, { useEffect, useState } from "react";
import { fetchHomepageSettings, saveHomepageSettings, uploadProductImage } from "../api.js";

const BLANK_SLIDE = {
  name: "", eyebrow: "THE NIRALI FESTIVE EDIT", title: "", description: "", image: "",
  linkLabel: "Explore the Collection", linkUrl: "/shop", note: "",
};

export default function AdminHomepage() {
  const [slides, setSlides] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetchHomepageSettings()
      .then((settings) => {
        setSlides(Array.isArray(settings.slides) ? settings.slides : []);
        setOffers(Array.isArray(settings.offers) && settings.offers.length ? settings.offers : [""]);
      })
      .catch(() => setNotice("Could not load homepage settings. Please refresh and try again."))
      .finally(() => setLoading(false));
  }, []);

  const changeSlide = (index, key, value) => {
    setSlides((current) => current.map((slide, i) => i === index ? { ...slide, [key]: value } : slide));
  };

  const uploadImage = async (index, file) => {
    if (!file) return;
    setUploading((current) => ({ ...current, [index]: true }));
    setNotice("");
    try {
      const result = await uploadProductImage(file);
      changeSlide(index, "image", result.url);
    } catch {
      setNotice("Image upload failed. Check the image and try again.");
    } finally {
      setUploading((current) => ({ ...current, [index]: false }));
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      await saveHomepageSettings({ slides, offers });
      setNotice("Homepage promotions saved and live.");
    } catch (error) {
      setNotice(error.response?.data?.message || "Could not save homepage promotions.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-loading">Loading homepage settings...</div>;

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">STOREFRONT CONTENT</span>
          <h1>Homepage Promotions</h1>
          <p>Manage the advertising carousel and scrolling offers shown to every visitor.</p>
        </div>
      </header>

      {notice && <div className="admin-promo-notice" role="status">{notice}</div>}

      <form className="admin-form admin-homepage-form" onSubmit={save}>
        <section className="admin-panel-card">
          <div className="admin-panel-head">
            <div><h2>Hero advertisements</h2><p>Add up to five campaign slides to the homepage carousel.</p></div>
            <button type="button" className="admin-action-btn-secondary" disabled={slides.length >= 5} onClick={() => setSlides((current) => [...current, { ...BLANK_SLIDE }])}>Add slide</button>
          </div>
          {slides.length === 0 && <p className="admin-promo-empty">No custom hero slides yet. The homepage will show featured products until you add a campaign.</p>}
          {slides.map((slide, index) => (
            <article className="admin-promo-slide" key={index}>
              <div className="admin-promo-slide-head"><h3>Slide {index + 1}</h3><button type="button" className="admin-promo-remove" onClick={() => setSlides((current) => current.filter((_, i) => i !== index))}>Remove</button></div>
              <div className="admin-form-row">
                <label>Campaign name<input value={slide.name || ""} onChange={(e) => changeSlide(index, "name", e.target.value)} placeholder="Festive edit" /></label>
                <label>Eyebrow<input value={slide.eyebrow || ""} onChange={(e) => changeSlide(index, "eyebrow", e.target.value)} maxLength="60" /></label>
              </div>
              <label>Headline<input value={slide.title || ""} onChange={(e) => changeSlide(index, "title", e.target.value)} required maxLength="120" placeholder="Celebrate in Heirloom Style" /></label>
              <label>Description<textarea rows="2" value={slide.description || ""} onChange={(e) => changeSlide(index, "description", e.target.value)} maxLength="240" /></label>
              <div className="admin-form-row">
                <label>Button text<input value={slide.linkLabel || ""} onChange={(e) => changeSlide(index, "linkLabel", e.target.value)} maxLength="50" /></label>
                <label>Button destination<input value={slide.linkUrl || ""} onChange={(e) => changeSlide(index, "linkUrl", e.target.value)} required placeholder="/shop or https://..." /></label>
              </div>
              <div className="admin-form-row">
                <label>Image URL<input value={slide.image || ""} onChange={(e) => changeSlide(index, "image", e.target.value)} required placeholder="Upload an image or paste an HTTPS URL" /></label>
                <label>Upload campaign image<input type="file" accept="image/*" onChange={(e) => uploadImage(index, e.target.files?.[0])} disabled={uploading[index]} /><small className="admin-image-help">{uploading[index] ? "Uploading…" : "Use a wide banner image for best results."}</small></label>
              </div>
              {slide.image && <img className="admin-promo-preview" src={slide.image} alt={`Preview of campaign slide ${index + 1}`} />}
              <label>Small note below button<input value={slide.note || ""} onChange={(e) => changeSlide(index, "note", e.target.value)} maxLength="100" /></label>
            </article>
          ))}
        </section>

        <section className="admin-panel-card">
          <div className="admin-panel-head"><div><h2>Scrolling offers</h2><p>These messages loop below the hero banner. Add at least one.</p></div></div>
          <div className="admin-promo-offers">
            {offers.map((offer, index) => (
              <div className="admin-promo-offer" key={index}>
                <label>Offer {index + 1}<input value={offer} maxLength="120" onChange={(e) => setOffers((current) => current.map((text, i) => i === index ? e.target.value : text))} placeholder="Complimentary shipping on orders above ₹2,999" /></label>
                <button type="button" className="admin-promo-remove" aria-label={`Remove offer ${index + 1}`} onClick={() => setOffers((current) => current.filter((_, i) => i !== index))}>Remove</button>
              </div>
            ))}
          </div>
          <button type="button" className="admin-action-btn-secondary" disabled={offers.length >= 10} onClick={() => setOffers((current) => [...current, ""])}>Add offer</button>
        </section>

        <div className="admin-promo-save-row"><span>Changes take effect on the storefront after saving.</span><button className="admin-save-btn" type="submit" disabled={saving || Object.values(uploading).some(Boolean)}>{saving ? "Saving…" : "Save homepage promotions"}</button></div>
      </form>
    </div>
  );
}
