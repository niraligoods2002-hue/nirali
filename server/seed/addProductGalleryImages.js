const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Product = require("../models/Product");

dotenv.config();

const galleryImages = [
  "https://images.pexels.com/photos/8229219/pexels-photo-8229219.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/34107842/pexels-photo-34107842.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/17040925/pexels-photo-17040925.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

async function addProductGalleryImages() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from server/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);
  const products = await Product.find({}, { images: 1 }).lean();
  const operations = products.map((product, index) => {
    const existingImages = (product.images || []).filter(Boolean);
    const additionalImages = [
      galleryImages[index % galleryImages.length],
      galleryImages[(index + 1) % galleryImages.length],
    ].filter((image) => !existingImages.includes(image));

    return {
      updateOne: {
        filter: { _id: product._id },
        update: { $addToSet: { images: { $each: additionalImages } } },
      },
    };
  });

  if (operations.length) {
    await Product.bulkWrite(operations);
  }

  const productsWithGallery = await Product.countDocuments({
    "images.2": { $exists: true },
  });

  console.log(`Updated ${operations.length} products.`);
  console.log(`${productsWithGallery} products now have at least three images.`);
}

addProductGalleryImages()
  .catch((error) => {
    console.error("Product gallery migration error:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
