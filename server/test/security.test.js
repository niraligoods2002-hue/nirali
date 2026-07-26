const test = require("node:test");
const assert = require("node:assert/strict");
const { safeEqual, rateLimit } = require("../middleware/securityMiddleware");
const Order = require("../models/Order");
const User = require("../models/User");
const pageRoutes = require("../routes/pageRoutes");
const productRoutes = require("../routes/api/productRoutes");
const { hashResetToken } = require("../controllers/authController");

test("constant-time string comparison handles equal and unequal values", () => {
  assert.equal(safeEqual("secret", "secret"), true);
  assert.equal(safeEqual("secret", "wrong"), false);
  assert.equal(safeEqual("short", "much-longer"), false);
});

test("rate limiter blocks requests above its configured maximum", () => {
  const middleware = rateLimit({ windowMs: 60_000, max: 2 });
  const req = { baseUrl: "/api/auth", path: "/login", ip: "127.0.0.10" };
  const response = () => ({
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  });
  let calls = 0;
  middleware(req, response(), () => { calls += 1; });
  middleware(req, response(), () => { calls += 1; });
  const blocked = response();
  middleware(req, blocked, () => { calls += 1; });
  assert.equal(calls, 2);
  assert.equal(blocked.statusCode, 429);
});

test("orders enforce per-user idempotency", () => {
  const index = Order.schema.indexes().find(([fields]) => fields.user === 1 && fields.idempotencyKey === 1);
  assert.ok(index);
  assert.equal(index[1].unique, true);
});

test("password reset tokens are hashed deterministically without storing the raw token", () => {
  const rawToken = "temporary-reset-token";
  const tokenHash = hashResetToken(rawToken);
  assert.notEqual(tokenHash, rawToken);
  assert.equal(tokenHash, hashResetToken(rawToken));
  assert.equal(tokenHash.length, 64);
});

test("password reset and session invalidation fields are protected by the user schema", () => {
  assert.equal(User.schema.path("passwordResetTokenHash").options.select, false);
  assert.equal(User.schema.path("passwordResetTokenExpires").options.select, false);
  assert.equal(User.schema.path("sessionVersion").options.default, 0);
});

test("all admin client routes are served by the protected admin shell", () => {
  const adminRoute = pageRoutes.stack
    .map((layer) => layer.route)
    .find((route) => Array.isArray(route?.path) && route.path.includes("/admin/products"));
  assert.ok(adminRoute);
  assert.deepEqual(adminRoute.path, [
    "/admin",
    "/admin/products",
    "/admin/orders",
    "/admin/reviews",
    "/admin/users",
  ]);
});

test("authenticated users cannot get stuck on the sign-in page", () => {
  const loginRoute = pageRoutes.stack
    .map((layer) => layer.route)
    .find((route) => route?.path === "/login");
  const handler = loginRoute.stack[0].handle;
  const response = {
    redirectTarget: null,
    redirect(target) { this.redirectTarget = target; return this; },
    render() { throw new Error("The login page should not render for an authenticated user"); },
  };

  handler({ user: { role: "user" } }, response);
  assert.equal(response.redirectTarget, "/");

  handler({ user: { role: "admin" } }, response);
  assert.equal(response.redirectTarget, "/admin");
});

test("the complete product inventory is exposed only through the protected admin route", () => {
  const adminInventoryRoute = productRoutes.stack
    .map((layer) => layer.route)
    .find((route) => route?.path === "/admin/all");
  assert.ok(adminInventoryRoute);
  assert.equal(adminInventoryRoute.methods.get, true);
  assert.equal(adminInventoryRoute.stack.length, 3);
});
