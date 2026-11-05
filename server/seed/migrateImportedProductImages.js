const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const Product = require("../models/Product");
const { imagekit, isConfigured } = require("../config/imagekit");

const imageGroups = [
  {
    image: "saree1.jpg",
    publicId: "imported-light-brown-and-rani-pink-sarees",
    slugs: ["light-brown-organza-resham-saree", "rani-pink-satin-chinon-mirror-saree"],
  },
  {
    image: "saree2.jpg",
    publicId: "imported-mustard-and-wine-sarees",
    slugs: ["mustard-yellow-tissue-silk-floral-saree", "wine-satin-silk-zari-saree"],
  },
  {
    image: "saree3.jpg",
    publicId: "imported-ivory-tissue-saree",
    slugs: ["ivory-tissue-cutdana-border-saree"],
  },
];

async function migrateImages() {
  if (!isConfigured()) {
    throw new Error("ImageKit is not configured");
  }

  await mongoose.connect(process.env.MONGO_URI);

  for (const group of imageGroups) {
    const imagePath = path.join(__dirname, "..", "public", "images", "products", group.image);
    const uploadedImage = await imagekit.upload({
      file: fs.readFileSync(imagePath),
      fileName: `${group.publicId}.jpg`,
      folder: "/luxora/products",
      useUniqueFileName: false,
    });

    await Product.updateMany(
      { slug: { $in: group.slugs } },
      { $set: { images: [uploadedImage.url] } }
    );
  }

  console.log("Imported product images were moved to ImageKit and updated in MongoDB.");
  await mongoose.disconnect();
}

migrateImages().catch(async (error) => {
  console.error("Image migration error:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
