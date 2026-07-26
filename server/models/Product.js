const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    category: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    discountPrice: Number,

    images: [
      {
        type: String,
      },
    ],

    colors: [
      {
        type: String,
      },
    ],

    colorImages: {
      type: Map,
      of: String,
      default: {},
    },

    sizes: [
      {
        type: String,
      },
    ],

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    rating: {
      type: Number,
      default: 5,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    bestseller: {
      type: Boolean,
      default: false,
    },

    newArrival: {
      type: Boolean,
      default: false,
    },

    details: {
      length: String,
      width: String,
      blousePiece: String,
      blouse: String,
      washCare: String,
      fabric: String,
      contents: String,
      sku: String,
      delivery: String,
      disclaimer: String,
      manufacturing: String,
      returnPolicy: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);

