const router = require("express").Router();

const {
  createReview,
  getApprovedReviews,
  getAllReviews,
  updateReviewStatus,
  deleteReview,
} = require("../../controllers/reviewController");
const { protect, adminOnly } = require("../../middleware/authMiddleware");

router.get("/", getApprovedReviews);
router.post("/", protect, createReview);
router.get("/admin", protect, adminOnly, getAllReviews);
router.put("/:id/status", protect, adminOnly, updateReviewStatus);
router.delete("/:id", protect, adminOnly, deleteReview);

module.exports = router;
