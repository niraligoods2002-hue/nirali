const router = require("express").Router();
const {
  register,
  login,
  getProfile,
  getAllUsers,
  updateUserRole,
  deleteUser,
} = require("../controllers/authController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// POST  /api/auth/register
router.post("/register", register);

// POST  /api/auth/login
router.post("/login", login);

// GET   /api/auth/me  (protected)
router.get("/me", protect, getProfile);

// ─── Admin routes ────────────────────────────────────────────────────────────

// GET    /api/auth/users          (admin: get all users)
router.get("/users", protect, adminOnly, getAllUsers);

// PUT    /api/auth/users/:id/role (admin: update role)
router.put("/users/:id/role", protect, adminOnly, updateUserRole);

// DELETE /api/auth/users/:id      (admin: delete user)
router.delete("/users/:id", protect, adminOnly, deleteUser);

module.exports = router;
