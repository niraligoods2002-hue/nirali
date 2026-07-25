const Review = require("../models/Review");

function formatReview(review) {
  return {
    id: review._id,
    user: review.user,
    name: review.name,
    email: review.email,
    rating: review.rating,
    text: review.text,
    status: review.status,
    createdAt: review.createdAt,
  };
}

exports.createReview = async (req, res) => {
  try {
    const { rating, text } = req.body;
    const parsedRating = Number(rating);

    if (!parsedRating || parsedRating < 1 || parsedRating > 5 || !text) {
      return res.status(400).json({ message: "Rating and review text are required" });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const reviewsToday = await Review.countDocuments({
      user: req.user._id,
      createdAt: { $gte: startOfToday },
    });

    if (reviewsToday >= 3) {
      return res.status(429).json({
        message: "You can write only 3 reviews per day. Please try again tomorrow.",
      });
    }

    const review = await Review.create({
      user: req.user._id,
      name: req.user.name,
      email: req.user.email,
      rating: parsedRating,
      text,
      status: "approved",
    });

    res.status(201).json({
      message: "Review submitted successfully",
      review: formatReview(review),
    });
  } catch (error) {
    console.error("Create review error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    res.status(500).json({ message: "Server error creating review" });
  }
};

exports.getApprovedReviews = async (_req, res) => {
  try {
    const reviews = await Review.find({ status: "approved" }).sort({ createdAt: -1 });
    res.json({ reviews: reviews.map(formatReview) });
  } catch (error) {
    console.error("Get approved reviews error:", error);
    res.status(500).json({ message: "Server error fetching reviews" });
  }
};

exports.getAllReviews = async (_req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json({ reviews: reviews.map(formatReview) });
  } catch (error) {
    console.error("Get all reviews error:", error);
    res.status(500).json({ message: "Server error fetching reviews" });
  }
};

exports.updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "hidden"].includes(status)) {
      return res.status(400).json({ message: "Invalid review status" });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json({ review: formatReview(review) });
  } catch (error) {
    console.error("Update review status error:", error);
    res.status(500).json({ message: "Server error updating review" });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({ message: "Server error deleting review" });
  }
};
