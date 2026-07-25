const router = require("express").Router();

const {
  createProduct,
  getAllProducts,
  getProductBySlug,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// GET     /api/products         (public)
router.get("/", getAllProducts);

// GET     /api/products/:slug   (public)
router.get("/:slug", getProductBySlug);

// ─── Admin routes ────────────────────────────────────────────────────────────

// POST    /api/products         (admin)
router.post("/", protect, adminOnly, createProduct);

// PUT     /api/products/:id     (admin)
router.put("/:id", protect, adminOnly, updateProduct);

// DELETE  /api/products/:id     (admin)
router.delete("/:id", protect, adminOnly, deleteProduct);

module.exports = router;
