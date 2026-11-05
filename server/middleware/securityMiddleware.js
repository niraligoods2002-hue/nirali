const crypto = require("crypto");

const buckets = new Map();

function rateLimit({ windowMs = 60_000, max = 30, key = (req) => req.ip, message = "Too many requests. Please try again later." } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = `${req.baseUrl}:${req.path}:${key(req)}`;
    let entry = buckets.get(bucketKey);
    if (!entry || entry.resetAt <= now) entry = { count: 0, resetAt: now + windowMs };
    entry.count += 1;
    buckets.set(bucketKey, entry);
    res.setHeader("RateLimit-Limit", max);
    res.setHeader("RateLimit-Remaining", Math.max(0, max - entry.count));
    res.setHeader("RateLimit-Reset", Math.ceil(entry.resetAt / 1000));
    if (entry.count > max) return res.status(429).json({ message });
    next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of buckets) if (value.resetAt <= now) buckets.delete(key);
}, 5 * 60_000).unref();

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("X-XSS-Protection", "0");

  if (process.env.NODE_ENV === "production" || req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://api.postalpincode.in https://ik.imagekit.io",
    "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  res.setHeader("Content-Security-Policy", csp);

  next();
}

function requireTrustedOrigin(req, res, next) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const origin = req.get("origin");
  const hostOrigin = `${req.protocol}://${req.get("host")}`;
  const allowed = new Set((process.env.ALLOWED_ORIGINS || "").split(",").map((v) => v.trim()).filter(Boolean));

  if (origin) {
    if (origin !== hostOrigin && !allowed.has(origin)) {
      return res.status(403).json({ message: "Untrusted request origin" });
    }
    return next();
  }

  const referer = req.get("referer");
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (refererOrigin !== hostOrigin && !allowed.has(refererOrigin)) {
        return res.status(403).json({ message: "Untrusted request referer" });
      }
    } catch {
      return res.status(403).json({ message: "Malformed request referer" });
    }
  }

  next();
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

module.exports = { rateLimit, securityHeaders, requireTrustedOrigin, safeEqual };
