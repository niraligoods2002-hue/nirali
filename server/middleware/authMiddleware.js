const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_FALLBACK_SECRET = "nirali_saree_production_fallback_jwt_secret_key_2026_secure";

function getJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) {
    return process.env.JWT_SECRET;
  }
  return JWT_FALLBACK_SECRET;
}

const attachUser = async (req, _res, next) => {
  try {
    const token = req.cookies?.token;
    if (token) {
      const decoded = jwt.verify(token, getJwtSecret());
      req.user = await User.findById(decoded.id);
      if (req.user && (decoded.sessionVersion ?? 0) !== (req.user.sessionVersion || 0)) req.user = null;
    }
  } catch {
    // An expired or invalid browser session should not block public pages.
  }
  next();
};

const protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header (Bearer token)
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // Fallback: check cookie
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res
        .status(401)
        .json({ message: "Not authorized \u2013 no token provided" });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({ message: "User no longer exists" });
    }
    if ((decoded.sessionVersion ?? 0) !== (req.user.sessionVersion || 0)) {
      return res.status(401).json({ message: "Session expired. Please sign in again." });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized \u2013 invalid token" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === "admin" || req.user.role === "Admin")) {
    next();
  } else {
    return res
      .status(403)
      .json({ message: "Access denied – admin only" });
  }
};

module.exports = { protect, adminOnly, attachUser };
