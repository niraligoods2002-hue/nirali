const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const connectDB = require("./config/db");
const mongoose = require("mongoose");
const { securityHeaders, requireTrustedOrigin, rateLimit } = require("./middleware/securityMiddleware");
const productRoutes = require("./routes/api/productRoutes");
const authRoutes = require("./routes/api/authRoutes");
const orderRoutes = require("./routes/api/orderRoutes");
const reviewRoutes = require("./routes/api/reviewRoutes");
const addressRoutes = require("./routes/api/addressRoutes");
const expressLayouts = require("express-ejs-layouts");
const pageRoutes = require("./routes/pageRoutes");
const homepageRoutes = require("./routes/api/homepageRoutes");
const { attachUser } = require("./middleware/authMiddleware");

const app = express();

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Middleware
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(securityHeaders);
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = new Set((process.env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean));
    if (allowed.has(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));
app.use(process.env.NODE_ENV === "production" ? morgan("combined") : morgan("dev"));
app.use(express.json({ limit: "100kb", verify: (req, _res, buffer) => { req.rawBody = buffer; } }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(cookieParser());
app.use(requireTrustedOrigin);
app.use("/api", rateLimit({ windowMs: 60_000, max: 120 }));

// Hosting providers use this endpoint to verify both the app and database.
app.get("/health", (_req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? "ok" : "unavailable",
    database: databaseReady ? "connected" : "disconnected",
  });
});

// Static files
app.use(express.static(path.join(__dirname, "public")));

// API Routes
app.use("/api/products", productRoutes);
app.use("/api/homepage", homepageRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/address", addressRoutes);

// Page Routes
app.use(attachUser);
app.use("/", pageRoutes);

// 404 handler
app.use((req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ message: "API route not found" });
  res.status(404).render("pages/shop", {
    layout: "layouts/main",
    title: "Not Found | Nirali Saree",
    path: "/shop",
    user: null,
    pageStyle: "shop",
    widgetScript: "product-shop",
    products: [],
    filter: "",
    search: "",
  });
});

const PORT = process.env.PORT || 5000;
let server;

async function startServer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");
  await connectDB();
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  return server;
}

async function shutdown(signal) {
  console.log(`${signal} received; shutting down safely`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.close();
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Application startup failed:", error.message);
    process.exit(1);
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => shutdown(signal).finally(() => process.exit(0)));
  }
}

module.exports = { app, startServer };
