const express = require("express");
const Product = require("../models/Product");
const Review = require("../models/Review");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();
const NEW_ARRIVAL_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

const reviews = [
  { name: "Priya Sharma", rating: 5, date: "2 weeks ago", text: "The quality of the saree exceeded my expectations. Beautiful craftsmanship and fast delivery!" },
  { name: "Anjali Patel", rating: 5, date: "1 month ago", text: "Absolutely loved the design. Got so many compliments at the wedding." },
  { name: "Meera Gupta", rating: 4, date: "3 weeks ago", text: "Great value for money. The fabric feels premium and the colors are vibrant." },
  { name: "Sneha Reddy", rating: 5, date: "2 months ago", text: "Nirali Saree has become my go-to store for traditional wear. Highly recommended!" },
  { name: "Kavita Joshi", rating: 4, date: "1 week ago", text: "Elegant collection and smooth shopping experience. Will shop again." },
  { name: "Divya Nair", rating: 5, date: "3 months ago", text: "The packaging was beautiful and the saree was even more stunning in person." },
];

function isNewArrival(product) {
  const createdAt = new Date(product.createdAt).getTime();
  return Number.isFinite(createdAt) && Date.now() - createdAt < NEW_ARRIVAL_WINDOW_MS;
}

function normalizeProduct(p) {
  const newArrival = isNewArrival(p);

  return {
    id: p._id.toString(),
    slug: p.slug,
    name: p.name,
    category: p.category,
    price: p.price,
    discountPrice: p.discountPrice,
    oldPrice: p.discountPrice || p.oldPrice,
    rating: p.rating || 5,
    reviews: p.reviews || 0,
    badge: p.bestseller ? "BEST SELLER" : newArrival ? "NEW" : p.featured ? "FEATURED" : "",
    image: p.images?.[0] || p.image,
    images: p.images || [p.image],
    description: p.description,
    colors: p.colors || [],
    colorImages: p.colorImages instanceof Map ? Object.fromEntries(p.colorImages) : (p.colorImages || {}),
    colorStock: p.colorStock instanceof Map ? Object.fromEntries(p.colorStock) : (p.colorStock || {}),
    sizes: p.sizes || ["Free Size"],
    stock: p.stock || 0,
    featured: p.featured,
    bestseller: p.bestseller,
    newArrival,
    details: p.details || {},
  };
}

function requireUserPage(req, res, next) {
  if (req.user) return next();
  return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
}

router.get("/", async (req, res) => {
  try {
    const products = await Product.find({ stock: { $gt: 0 } }).sort({ category: 1, createdAt: -1 });
    res.render("pages/home", {
      layout: "layouts/main",
      title: "Nirali Saree | Elegant Sarees",
      path: "/",
      user: req.user || null,
      pageStyle: "home",
      widgetScript: "featured-products",
      homeProducts: products.map(normalizeProduct),
    });
  } catch (err) {
    res.render("pages/home", {
      layout: "layouts/main",
      title: "Nirali Saree | Elegant Sarees",
      path: "/",
      user: req.user || null,
      pageStyle: "home",
      widgetScript: "featured-products",
      homeProducts: [],
    });
  }
});

router.get("/shop", async (req, res) => {
  try {
    const products = await Product.find({ stock: { $gt: 0 } });
    res.render("pages/shop", {
      layout: "layouts/main",
      title: "Shop | Nirali Saree",
      path: "/shop",
      user: req.user || null,
      pageStyle: "shop",
      widgetScript: "product-shop",
      products: products.map(normalizeProduct),
      filter: req.query.filter || "",
      search: req.query.search || "",
    });
  } catch (err) {
    res.render("pages/shop", {
      layout: "layouts/main",
      title: "Shop | Nirali Saree",
      path: "/shop",
      user: req.user || null,
      pageStyle: "shop",
      widgetScript: "product-shop",
      products: [],
      filter: "",
      search: "",
    });
  }
});

router.get("/products/:slug", async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, stock: { $gt: 0 } });
    if (!product) return res.status(404).render("pages/shop", {
      layout: "layouts/main",
      title: "Not Found | Nirali Saree",
      path: "/shop",
      user: req.user || null,
      pageStyle: "shop",
      widgetScript: "product-shop",
      products: [],
      filter: "",
      search: "",
    });

    res.render("pages/product-detail", {
      layout: "layouts/main",
      title: `${product.name} | Nirali Saree`,
      path: "/shop",
      user: req.user || null,
      pageStyle: "product-detail",
      widgetScript: "product-detail",
      product: normalizeProduct(product),
    });
  } catch (err) {
    res.redirect("/shop");
  }
});

router.get("/cart", (req, res) => {
  res.render("pages/cart", {
    layout: "layouts/main",
    title: "Cart | Nirali Saree",
    path: "/cart",
    user: req.user || null,
    pageStyle: "cart",
    widgetScript: "cart-page",
  });
});

router.get("/checkout", requireUserPage, (req, res) => {
  res.render("pages/checkout", {
    layout: "layouts/main",
    title: "Checkout | Nirali Saree",
    path: "/checkout",
    user: req.user || null,
    pageStyle: "checkout",
    widgetScript: "cart-page",
  });
});

router.get("/login", (req, res) => {
  if (req.user) return res.redirect(req.user.role === "admin" ? "/admin" : "/");
  res.render("pages/login", {
    layout: "layouts/main",
    title: "Sign In | Nirali Saree",
    path: "/login",
    user: null,
    pageStyle: "auth",
  });
});

router.get("/signup", (req, res) => {
  if (req.user) return res.redirect(req.user.role === "admin" ? "/admin" : "/");
  res.render("pages/signup", {
    layout: "layouts/main",
    title: "Sign Up | Nirali Saree",
    path: "/signup",
    user: null,
    pageStyle: "auth",
  });
});

router.get("/forgot-password", (_req, res) => {
  res.render("pages/forgot-password", {
    layout: "layouts/main",
    title: "Forgot Password | Nirali Saree",
    path: "/forgot-password",
    user: null,
    pageStyle: "auth",
  });
});

router.get("/reset-password", (_req, res) => {
  res.render("pages/reset-password", {
    layout: "layouts/main",
    title: "Reset Password | Nirali Saree",
    path: "/reset-password",
    user: null,
    pageStyle: "auth",
  });
});

router.get("/account", requireUserPage, (req, res) => {
  res.render("pages/account", {
    layout: "layouts/main",
    title: "My Account | Nirali Saree",
    path: "/account",
    user: req.user,
    pageStyle: "account",
    widgetScript: "user-dashboard",
  });
});

router.get("/verify-email", (req, res) => {
  res.render("pages/verify-email", {
    layout: "layouts/main",
    title: "Verify Email | Nirali Saree",
    path: "/verify-email",
    user: null,
    pageStyle: "auth",
  });
});

router.get("/about", (req, res) => {
  res.render("pages/about", {
    layout: "layouts/main",
    title: "About | Nirali Saree",
    path: "/about",
    user: req.user || null,
    pageStyle: "about",
  });
});

router.get("/contact", (req, res) => {
  res.render("pages/contact", {
    layout: "layouts/main",
    title: "Contact | Nirali Saree",
    path: "/contact",
    user: req.user || null,
    pageStyle: "contact",
  });
});

router.get("/reviews", async (req, res) => {
  try {
    const dbReviews = await Review.find({ status: "approved" }).sort({ createdAt: -1 });
    res.render("pages/reviews", {
      layout: "layouts/main",
      title: "Reviews | Nirali Saree",
      path: "/reviews",
      user: req.user || null,
      pageStyle: "reviews",
      reviews: [...dbReviews.map((review) => ({
        id: review._id.toString(),
        name: review.name,
        rating: review.rating,
        date: review.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        text: review.text,
      })), ...reviews],
    });
  } catch (err) {
    res.render("pages/reviews", {
      layout: "layouts/main",
      title: "Reviews | Nirali Saree",
      path: "/reviews",
      user: req.user || null,
      pageStyle: "reviews",
      reviews,
    });
  }
});

router.get(["/admin", "/admin/products", "/admin/orders", "/admin/reviews", "/admin/users"], requireUserPage, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).redirect("/");
  res.render("pages/admin", {
    layout: "layouts/admin",
    title: "Admin Dashboard | Nirali Saree",
    user: req.user || null,
  });
});

module.exports = router;
