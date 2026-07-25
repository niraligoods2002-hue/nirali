const router = require("express").Router();
const {
  register,
  login,
  logout,
  verifyEmailOtp,
  resendEmailOtp,
  forgotPassword,
  resetPassword,
  getProfile,
  getAllUsers,
  updateUserRole,
  deleteUser,
} = require("../../controllers/authController");
const { protect, adminOnly } = require("../../middleware/authMiddleware");
const { rateLimit } = require("../../middleware/securityMiddleware");

const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, message: "Too many authentication attempts. Try again in 15 minutes." });
const otpLimiter = rateLimit({ windowMs: 15 * 60_000, max: 5, message: "Too many OTP requests. Try again later." });

// POST  /api/auth/register
router.post("/register", authLimiter, register);

// POST  /api/auth/login
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.post("/verify-email", authLimiter, verifyEmailOtp);
router.post("/resend-otp", otpLimiter, resendEmailOtp);
router.post("/forgot-password", otpLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);

// GET   /api/auth/me  (protected)
router.get("/me", protect, getProfile);

// Admin routes
router.get("/users", protect, adminOnly, getAllUsers);
router.put("/users/:id/role", protect, adminOnly, updateUserRole);
router.delete("/users/:id", protect, adminOnly, deleteUser);

module.exports = router;
