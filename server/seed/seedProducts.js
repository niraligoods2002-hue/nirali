const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Product = require("../models/Product");

dotenv.config();

const products = [
  {
    name: "Beige Organza Embroidered Saree",
    slug: "beige-organza-embroidered-saree",
    category: "Organza Saree",
    description:
      "Exquisite beige organza saree featuring intricate hand-embroidered floral motifs.",
    price: 11897,
    discountPrice: 13999,
    images: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&h=1000&fit=crop",
    ],
    colors: ["Beige", "Ivory"],
    sizes: ["Free Size"],
    stock: 24,
    rating: 4.9,
    featured: true,
    bestseller: true,
  },
  {
    name: "Sky Blue Tissue Saree",
    slug: "sky-blue-tissue-saree",
    category: "Designer Saree",
    description:
      "Stunning sky blue tissue saree with a subtle shimmer finish.",
    price: 10396,
    discountPrice: 12499,
    images: [
      "https://images.unsplash.com/photo-1583391734527-7e944834aee8?w=800&h=1000&fit=crop",
    ],
    colors: ["Sky Blue"],
    sizes: ["Free Size"],
    stock: 18,
    rating: 4.8,
    featured: true,
    newArrival: true,
  },
  {
    name: "Pink Silk Party Saree",
    slug: "pink-silk-party-saree",
    category: "Silk Saree",
    description:
      "Luxurious pink silk saree with golden zari border.",
    price: 16499,
    discountPrice: 18999,
    images: [
      "https://images.unsplash.com/photo-1617629632578-5d8a19575d52?w=800&h=1000&fit=crop",
    ],
    colors: ["Pink", "Rose Gold"],
    sizes: ["Free Size"],
    stock: 12,
    rating: 5,
    featured: true,
    bestseller: true,
  },
  {
    name: "Emerald Banarasi Silk Saree",
    slug: "emerald-banarasi-silk-saree",
    category: "Banarasi Saree",
    description:
      "Authentic Banarasi silk saree in rich emerald green with traditional brocade weaving.",
    price: 22499,
    discountPrice: 26999,
    images: [
      "https://images.unsplash.com/photo-1610030460613-ea0d8e8c2d62?w=800&h=1000&fit=crop",
    ],
    colors: ["Emerald Green"],
    sizes: ["Free Size"],
    stock: 8,
    rating: 4.9,
    featured: true,
  },
  {
    name: "Coral Georgette Printed Saree",
    slug: "coral-georgette-printed-saree",
    category: "Georgette Saree",
    description:
      "Vibrant coral georgette saree with digital floral prints.",
    price: 7499,
    discountPrice: 9999,
    images: [
      "https://images.unsplash.com/photo-1595777216528-069e3328f2a5?w=800&h=1000&fit=crop",
    ],
    colors: ["Coral", "Peach"],
    sizes: ["Free Size"],
    stock: 35,
    rating: 4.7,
    featured: false,
  },
  {
    name: "Midnight Black Velvet Saree",
    slug: "midnight-black-velvet-saree",
    category: "Velvet Saree",
    description:
      "Opulent midnight black velvet saree with sequin embellishments.",
    price: 18999,
    discountPrice: 22999,
    images: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&h=1000&fit=crop&q=80",
    ],
    colors: ["Black"],
    sizes: ["Free Size"],
    stock: 6,
    rating: 4.8,
    featured: true,
  },
  {
    name: "Lavender Chiffon Saree",
    slug: "lavender-chiffon-saree",
    category: "Chiffon Saree",
    description:
      "Delicate lavender chiffon saree with pearl border detailing.",
    price: 8999,
    discountPrice: 11499,
    images: [
      "https://images.unsplash.com/photo-1583391734527-7e944834aee8?w=800&h=1000&fit=crop&q=80",
    ],
    colors: ["Lavender", "Lilac"],
    sizes: ["Free Size"],
    stock: 22,
    rating: 4.6,
    featured: false,
    newArrival: true,
  },
  {
    name: "Golden Kanjivaram Saree",
    slug: "golden-kanjivaram-saree",
    category: "Kanjivaram Saree",
    description:
      "Authentic Kanjivaram silk saree in regal gold with temple border.",
    price: 34999,
    discountPrice: 42999,
    images: [
      "https://images.unsplash.com/photo-1617629632578-5d8a19575d52?w=800&h=1000&fit=crop&q=80",
    ],
    colors: ["Gold", "Maroon"],
    sizes: ["Free Size"],
    stock: 4,
    rating: 5,
    featured: true,
    bestseller: true,
  },
  {
    name: "White Linen Casual Saree",
    slug: "white-linen-casual-saree",
    category: "Linen Saree",
    description:
      "Breathable white linen saree with minimal embroidery.",
    price: 5999,
    discountPrice: 7999,
    images: [
      "https://images.unsplash.com/photo-1595777216528-069e3328f2a5?w=800&h=1000&fit=crop&q=80",
    ],
    colors: ["White", "Off-White"],
    sizes: ["Free Size"],
    stock: 40,
    rating: 4.5,
    featured: false,
  },
  {
    name: "Ruby Red Bridal Silk Saree",
    slug: "ruby-red-bridal-silk-saree",
    category: "Bridal Saree",
    description:
      "Majestic ruby red bridal silk saree with heavy zari work and stone embellishments.",
    price: 45999,
    discountPrice: 52999,
    images: [
      "https://images.unsplash.com/photo-1609245340409-cad2474ab1d5?w=800&h=1000&fit=crop&q=80",
    ],
    colors: ["Ruby Red", "Maroon"],
    sizes: ["Free Size"],
    stock: 5,
    rating: 5,
    featured: true,
    bestseller: true,
  },
  {
    name: "Peach Organza Floral Saree",
    slug: "peach-organza-floral-saree",
    category: "Organza Saree",
    description:
      "Soft peach organza saree with delicate floral embroidery and pearl highlights.",
    price: 11299,
    discountPrice: 13499,
    images: [
      "https://images.unsplash.com/photo-1596813362035-3edcff0c2487?w=800&h=1000&fit=crop&q=80",
    ],
    colors: ["Peach", "Blush Pink"],
    sizes: ["Free Size"],
    stock: 19,
    rating: 4.7,
    featured: true,
    newArrival: true,
  },
  {
    name: "Royal Blue Banarasi Saree",
    slug: "royal-blue-banarasi-saree",
    category: "Banarasi Saree",
    description:
      "Royal blue Banarasi silk saree with silver zari motifs and rich pallu.",
    price: 28999,
    discountPrice: 33999,
    images: [
      "https://images.unsplash.com/photo-1610030460613-ea0d8e8c2d62?w=800&h=1000&fit=crop&q=80",
    ],
    colors: ["Royal Blue", "Navy"],
    sizes: ["Free Size"],
    stock: 7,
    rating: 4.9,
    featured: true,
  },
  {
    name: "Mint Green Chiffon Saree",
    slug: "mint-green-chiffon-saree",
    category: "Chiffon Saree",
    description:
      "Refreshing mint green chiffon saree with sequin border for evening gatherings.",
    price: 8499,
    discountPrice: 10499,
    images: [
      "https://images.unsplash.com/photo-1583391734527-7e944834aee8?w=800&h=1000&fit=crop&q=80",
    ],
    colors: ["Mint Green"],
    sizes: ["Free Size"],
    stock: 28,
    rating: 4.6,
    featured: false,
    newArrival: true,
  },
  {
    name: "Black Gold Cocktail Saree",
    slug: "black-gold-cocktail-saree",
    category: "Designer Saree",
    description:
      "Sophisticated black saree with gold foil print, perfect for cocktail parties.",
    price: 15499,
    discountPrice: 18499,
    images: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&h=1000&fit=crop&q=80",
    ],
    colors: ["Black", "Gold"],
    sizes: ["Free Size"],
    stock: 14,
    rating: 4.8,
    featured: true,
    bestseller: true,
  },
  {
    name: "Yellow Cotton Handloom Saree",
    slug: "yellow-cotton-handloom-saree",
    category: "Cotton Saree",
    description:
      "Bright yellow handloom cotton saree with traditional temple border.",
    price: 4999,
    discountPrice: 6499,
    images: [
      "https://images.unsplash.com/photo-1595777216528-069e3328f2a5?w=800&h=1000&fit=crop&q=80",
    ],
    colors: ["Yellow", "Mustard"],
    sizes: ["Free Size"],
    stock: 45,
    rating: 4.4,
    featured: false,
  },
  {
    name: "Magenta Georgette Party Saree",
    slug: "magenta-georgette-party-saree",
    category: "Georgette Saree",
    description:
      "Vibrant magenta georgette saree with ruffle details and mirror work.",
    price: 9999,
    discountPrice: 12499,
    images: [
      "https://images.unsplash.com/photo-1617629632578-5d8a19575d52?w=800&h=1000&fit=crop&q=80",
    ],
    colors: ["Magenta", "Fuchsia"],
    sizes: ["Free Size"],
    stock: 21,
    rating: 4.7,
    featured: true,
    newArrival: true,
  },
  {
    name: "Ivory Pearl Embellished Saree",
    slug: "ivory-pearl-embellished-saree",
    category: "Designer Saree",
    description:
      "Elegant ivory saree with pearl embellishments and scalloped edges.",
    price: 19999,
    discountPrice: 23999,
    images: [
      "https://images.unsplash.com/photo-1609245340409-cad2474ab1d5?w=800&h=1000&fit=crop&q=80",
    ],
    colors: ["Ivory", "Cream"],
    sizes: ["Free Size"],
    stock: 9,
    rating: 4.9,
    featured: true,
  },
  {
    name: "Teal Blue Tussar Silk Saree",
    slug: "teal-blue-tussar-silk-saree",
    category: "Silk Saree",
    description:
      "Handwoven teal blue Tussar silk saree with natural texture and tribal motifs.",
    price: 13499,
    discountPrice: 16499,
    images: [
      "https://images.unsplash.com/photo-1596813362035-3edcff0c2487?w=800&h=1000&fit=crop&q=80",
    ],
    colors: ["Teal Blue"],
    sizes: ["Free Size"],
    stock: 16,
    rating: 4.8,
    featured: false,
    bestseller: true,
  },
  {
    name: "Rose Gold Net Saree",
    slug: "rose-gold-net-saree",
    category: "Net Saree",
    description:
      "Glamorous rose gold net saree with crystal work and satin border.",
    price: 21999,
    discountPrice: 25999,
    images: [
      "https://images.unsplash.com/photo-1610030460613-ea0d8e8c2d62?w=800&h=1000&fit=crop&q=80",
    ],
    colors: ["Rose Gold", "Champagne"],
    sizes: ["Free Size"],
    stock: 11,
    rating: 4.8,
    featured: true,
    newArrival: true,
  },
];


async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    await Product.deleteMany({});
    console.log("Cleared existing products");

    await Product.insertMany(products);
    console.log(`Seeded ${products.length} products`);

    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error.message);
    process.exit(1);
  }
}

seed();
