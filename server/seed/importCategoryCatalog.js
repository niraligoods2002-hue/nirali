const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Product = require("../models/Product");

dotenv.config();

const { imagekit, isConfigured } = require("../config/imagekit");

// Pexels provides these stock photos for free use. This script downloads each
// source file into memory, then stores a copy in this project's ImageKit account.
const stockImages = [
  "https://images.pexels.com/photos/8229219/pexels-photo-8229219.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/34107842/pexels-photo-34107842.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/17040925/pexels-photo-17040925.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const categories = [
  { name: "Printed Saree", fabric: "Soft Georgette", price: 3299 },
  { name: "Embroidered Saree", fabric: "Organza", price: 6999 },
  { name: "Sequins Saree", fabric: "Net", price: 7499 },
  { name: "Ready Pleated Saree", fabric: "Satin Crepe", price: 5499 },
  { name: "Plain Saree", fabric: "Chiffon", price: 2899 },
  { name: "Woven Saree", fabric: "Art Silk", price: 5299 },
  { name: "Indo Western", fabric: "Draped Crepe", price: 6899, productType: "Drape Saree Set" },
  { name: "Embellished Saree", fabric: "Tissue Silk", price: 8199 },
  { name: "Bandhani Saree", fabric: "Dola Silk", price: 4899 },
  { name: "Banarasi Saree", fabric: "Banarasi Silk", price: 8999 },
  { name: "Crop Top Styles", fabric: "Georgette", price: 6399, productType: "Saree With Crop Top" },
  { name: "Plain Saree With Border", fabric: "Cotton Silk", price: 3799 },
];

const variants = [
  ["Ruby Garden", "Ruby Red"],
  ["Ivory Bloom", "Ivory"],
  ["Midnight Rose", "Midnight Blue"],
  ["Emerald Grace", "Emerald Green"],
  ["Blush Gold", "Blush Pink"],
  ["Royal Wine", "Wine"],
  ["Mustard Muse", "Mustard Yellow"],
];

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function uploadLicensedStockImage(sourceUrl, publicId) {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`Could not download stock image (${response.status})`);
  const imageBuffer = Buffer.from(await response.arrayBuffer());

  const result = await imagekit.upload({
    file: imageBuffer,
    fileName: `${publicId}.jpg`,
    folder: "/luxora/category-catalog",
    useUniqueFileName: false,
  });

  return { url: result.url, secure_url: result.url, fileId: result.fileId };
}

function buildProducts(category, categoryIndex, imageUrl) {
  const productType = category.productType || category.name;
  return variants.map(([collectionName, color], variantIndex) => {
    const price = category.price + variantIndex * 350;
    const sku = `LX-${String(categoryIndex + 1).padStart(2, "0")}-${String(variantIndex + 1).padStart(2, "0")}`;
    const name = `${collectionName} ${productType}`;
    return {
      name,
      slug: slugify(`${collectionName}-${productType}`),
      category: category.name,
      description: `A ${color.toLowerCase()} ${category.fabric.toLowerCase()} ${productType.toLowerCase()} designed for celebrations, wedding events, and elegant occasions.`,
      price,
      discountPrice: price + 700,
      images: [imageUrl],
      colors: [color],
      sizes: ["Free Size"],
      stock: 8 + variantIndex * 2,
      rating: Number((4.5 + (variantIndex % 4) * 0.1).toFixed(1)),
      featured: variantIndex === 0,
      bestseller: variantIndex === 1,
      newArrival: variantIndex === 2,
      details: {
        length: category.name === "Indo Western" ? "Pre-draped" : "5.5 m (550 cm)",
        width: "1.1 m (110 cm)",
        blousePiece: category.name === "Indo Western" ? "Co-ordinated blouse included" : "Unstitched blouse piece included",
        blouse: "The model is wearing a styled blouse from our in-house collection.",
        washCare: "Dry clean only",
        fabric: category.fabric,
        contents: category.name === "Indo Western" ? "1 pre-draped saree set" : "1 Saree and 1 unstitched blouse piece",
        sku,
        delivery: "Dispatched in 3-5 business days. Free domestic shipping above Rs. 1,999.",
        disclaimer: "Colours may vary slightly because of lighting and individual screen settings.",
        manufacturing: "Designed and packed in India.",
        returnPolicy: "Easy returns within 5 days for unused, unstitched items with original tags.",
      },
    };
  });
}

async function importCategoryCatalog() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing from server/.env");
  if (!isConfigured()) throw new Error("ImageKit credentials are missing from server/.env");
  await mongoose.connect(process.env.MONGO_URI);
  let newProducts = 0;

  for (const [index, category] of categories.entries()) {
    const image = await uploadLicensedStockImage(stockImages[index % stockImages.length], `category-${slugify(category.name)}`);
    const result = await Product.bulkWrite(buildProducts(category, index, image.secure_url).map((product) => ({
      updateOne: { filter: { slug: product.slug }, update: { $setOnInsert: product }, upsert: true },
    })));
    newProducts += result.upsertedCount;
    console.log(`${category.name}: ${result.upsertedCount} new product(s)`);
  }

  console.log(`Catalog complete: ${newProducts} new products added. Existing products were not changed.`);
}

importCategoryCatalog()
  .catch((error) => {
    console.error("Category catalog import error:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
