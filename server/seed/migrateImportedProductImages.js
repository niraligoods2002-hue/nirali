const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Product = require("../models/Product");
const { cloudinary, isConfigured } = require("../config/cloudinary");

dotenv.config();

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
    throw new Error("Cloudinary is not configured");
  }

  await mongoose.connect(process.env.MONGO_URI);

  for (const group of imageGroups) {
    const imagePath = path.join(__dirname, "..", "public", "images", "products", group.image);
    const uploadedImage = await cloudinary.uploader.upload(imagePath, {
      folder: "luxora/products",
      public_id: group.publicId,
      overwrite: true,
      resource_type: "image",
    });

    await Product.updateMany(
      { slug: { $in: group.slugs } },
      { $set: { images: [uploadedImage.secure_url] } }
    );
  }

  console.log("Imported product images were moved to Cloudinary and updated in MongoDB.");
  await mongoose.disconnect();
}

migrateImages().catch(async (error) => {
  console.error("Image migration error:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
