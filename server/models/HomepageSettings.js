const mongoose = require("mongoose");

const slideSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 100, default: "" },
  eyebrow: { type: String, trim: true, maxlength: 60, default: "THE NIRALI FESTIVE EDIT" },
  title: { type: String, trim: true, maxlength: 120, default: "Celebrate in Heirloom Style" },
  description: { type: String, trim: true, maxlength: 240, default: "Discover handcrafted sarees made for the moments you will remember." },
  image: { type: String, trim: true, maxlength: 2048, default: "" },
  linkLabel: { type: String, trim: true, maxlength: 50, default: "Explore the Collection" },
  linkUrl: { type: String, trim: true, maxlength: 300, default: "/shop" },
  note: { type: String, trim: true, maxlength: 100, default: "Handpicked styles · Pan-India delivery" },
}, { _id: false });

const homepageSettingsSchema = new mongoose.Schema({
  key: { type: String, default: "homepage", unique: true, immutable: true },
  slides: { type: [slideSchema], default: [] },
  offers: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.models.HomepageSettings || mongoose.model("HomepageSettings", homepageSettingsSchema);
