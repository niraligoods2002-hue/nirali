const router = require("express").Router();

const {
  uploadProductImage,
  createProduct,
  getAllProducts,
  getAllProductsForAdmin,
  getProductBySlug,
  updateProduct,
  deleteProduct,
} = require("../../controllers/productController");
const { protect, adminOnly } = require("../../middleware/authMiddleware");
const upload = require("../../middleware/uploadMiddleware");

const handleImageUpload = (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (!error) return next();
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Image must be 5 MB or smaller"
      : error.message;
    return res.status(400).json({ message });
  });
};

// GET     /api/products         (public)
router.get("/", getAllProducts);

router.get("/admin/all", protect, adminOnly, getAllProductsForAdmin);

// GET     /api/products/:slug   (public)
router.get("/:slug", getProductBySlug);

// Admin routes
router.post("/upload", protect, adminOnly, handleImageUpload, uploadProductImage);
router.post("/", protect, adminOnly, createProduct);
router.put("/:id", protect, adminOnly, updateProduct);
router.delete("/:id", protect, adminOnly, deleteProduct);

module.exports = router;
