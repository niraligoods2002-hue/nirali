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

function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  next();
}

function requireTrustedOrigin(req, res, next) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (!origin) return next(); // native clients and server-to-server requests
  const allowed = new Set((process.env.ALLOWED_ORIGINS || "").split(",").map((v) => v.trim()).filter(Boolean));
  const hostOrigin = `${req.protocol}://${req.get("host")}`;
  if (origin !== hostOrigin && !allowed.has(origin)) return res.status(403).json({ message: "Untrusted request origin" });
  next();
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

module.exports = { rateLimit, securityHeaders, requireTrustedOrigin, safeEqual };
