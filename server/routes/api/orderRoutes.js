const router = require("express").Router();

const {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  downloadDeliveryLabel,
  getCheckoutDetails,
  updateCheckoutDetails,
} = require("../../controllers/orderController");
const { protect, adminOnly } = require("../../middleware/authMiddleware");
const { lookupPincode, lookupCity, suggestCities } = require("../../controllers/locationController");
const { rateLimit } = require("../../middleware/securityMiddleware");

const orderLimiter = rateLimit({ windowMs: 60_000, max: 5, key: (req) => String(req.user?._id || req.ip), message: "Too many order attempts. Please wait a minute." });
const locationLimiter = rateLimit({ windowMs: 60_000, max: 30, key: (req) => String(req.user?._id || req.ip) });

router.get("/location/cities/:query", protect, locationLimiter, suggestCities);
router.get("/location/city/:city", protect, locationLimiter, lookupCity);
router.get("/location/:pincode", protect, locationLimiter, lookupPincode);
router.get("/checkout-details", protect, getCheckoutDetails);
router.put("/checkout-details", protect, updateCheckoutDetails);
router.post("/", protect, orderLimiter, createOrder);
router.get("/my", protect, getMyOrders);
router.get("/", protect, adminOnly, getAllOrders);
router.get("/:id/delivery-label", protect, adminOnly, downloadDeliveryLabel);
router.put("/:id/status", protect, adminOnly, updateOrderStatus);

module.exports = router;
