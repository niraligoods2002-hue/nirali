const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Product = require("../models/Product");

dotenv.config();

// Product names and prices were referenced from KALKI Fashion's saree collection
// on 16 July 2026. Images below are placeholders and should be replaced with
// licensed product photography through the admin dashboard.
const products = [
  {
    name: "Light Brown Organza Resham Saree",
    slug: "light-brown-organza-resham-saree",
    category: "Organza Saree",
    description: "A light brown organza saree with delicate resham thread embroidery for festive occasions.",
    price: 6796,
    discountPrice: 7995,
    images: ["https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&h=1000&fit=crop"],
    colors: ["Light Brown"],
    sizes: ["Free Size"],
    stock: 10,
    rating: 4.8,
    featured: true,
    newArrival: true,
  },
  {
    name: "Mustard Yellow Tissue Silk Floral Saree",
    slug: "mustard-yellow-tissue-silk-floral-saree",
    category: "Tissue Silk Saree",
    description: "Mustard yellow tissue silk saree with floral resham embroidery and a soft festive sheen.",
    price: 4197,
    images: ["https://images.unsplash.com/photo-1595777216528-069e3328f2a5?w=800&h=1000&fit=crop"],
    colors: ["Mustard Yellow"],
    sizes: ["Free Size"],
    stock: 14,
    rating: 4.7,
    bestseller: true,
  },
  {
    name: "Ivory Tissue Cutdana Border Saree",
    slug: "ivory-tissue-cutdana-border-saree",
    category: "Tissue Saree",
    description: "An ivory tissue saree finished with a cutdana embroidered border and unstitched blouse fabric.",
    price: 6297,
    images: ["https://images.unsplash.com/photo-1609245340409-cad2474ab1d5?w=800&h=1000&fit=crop"],
    colors: ["Ivory"],
    sizes: ["Free Size"],
    stock: 8,
    rating: 4.9,
    featured: true,
  },
  {
    name: "Rani Pink Satin Chinon Mirror Saree",
    slug: "rani-pink-satin-chinon-mirror-saree",
    category: "Satin Saree",
    description: "Rani pink satin chinon saree with mirror and bead work along the embroidered border.",
    price: 8796,
    images: ["https://images.unsplash.com/photo-1617629632578-5d8a19575d52?w=800&h=1000&fit=crop"],
    colors: ["Rani Pink"],
    sizes: ["Free Size"],
    stock: 9,
    rating: 4.8,
    newArrival: true,
  },
  {
    name: "Wine Satin Silk Zari Saree",
    slug: "wine-satin-silk-zari-saree",
    category: "Silk Saree",
    description: "A wine satin silk woven saree accented by rich zari embroidery for celebrations and evening events.",
    price: 6396,
    images: ["https://images.unsplash.com/photo-1610030460613-ea0d8e8c2d62?w=800&h=1000&fit=crop"],
    colors: ["Wine"],
    sizes: ["Free Size"],
    stock: 7,
    rating: 4.8,
    featured: true,
  },
];

async function importProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const result = await Product.bulkWrite(
      products.map((product) => ({
        updateOne: {
          filter: { slug: product.slug },
          update: { $setOnInsert: product },
          upsert: true,
        },
      }))
    );
    console.log(`Imported ${result.upsertedCount} new product(s); existing listings were left unchanged.`);
    await mongoose.disconnect();
  } catch (error) {
    console.error("Product import error:", error.message);
    process.exitCode = 1;
  }
}

importProducts();
