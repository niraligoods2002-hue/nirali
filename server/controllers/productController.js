const Product = require("../models/Product");
const { imagekit, isConfigured } = require("../config/imagekit");

// POST /api/products/upload (admin only)
const uploadProductImage = async (req, res) => {
  if (!isConfigured()) {
    return res.status(500).json({ message: "ImageKit is not configured on the server" });
  }

  if (!req.file) {
    return res.status(400).json({ message: "Please select an image to upload" });
  }

  try {
    const sanitizedOriginalName = (req.file.originalname || "image.jpg").replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `product-${Date.now()}-${sanitizedOriginalName}`;

    const result = await imagekit.upload({
      file: req.file.buffer,
      fileName,
      folder: "/luxora/products",
      useUniqueFileName: true,
    });

    res.status(201).json({
      url: result.url,
      publicId: result.fileId,
      fileId: result.fileId,
    });
  } catch (error) {
    console.error("ImageKit upload error:", error);
    res.status(500).json({ message: "Could not upload image. Please try again." });
  }
};

// POST /api/products
const createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    console.error("Create product error:", error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "Product slug already exists" });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(400).json({ message: error.message });
  }
};

// GET /api/products
const getAllProducts = async (_req, res) => {
  try {
    const products = await Product.find({ stock: { $gt: 0 }, published: { $ne: false } }).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllProductsForAdmin = async (_req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/products/:slug
const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, stock: { $gt: 0 }, published: { $ne: false } });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/products/:id  (admin only)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error("Update product error:", error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "Product slug already exists" });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/products/:id  (admin only)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadProductImage,
  createProduct,
  getAllProducts,
  getAllProductsForAdmin,
  getProductBySlug,
  updateProduct,
  deleteProduct,
};
