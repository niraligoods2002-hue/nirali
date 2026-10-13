const test = require("node:test");
const assert = require("node:assert/strict");
const Product = require("../models/Product");
const { getAllProducts } = require("../controllers/productController");
const pageRoutes = require("../routes/pageRoutes");

test("saree catalog schema supports storefront status and descriptive details", () => {
  assert.equal(Product.schema.path("published").defaultValue, true);
  assert.equal(Product.schema.path("collectionName").instance, "String");
  assert.equal(Product.schema.path("occasion").instance, "String");
  assert.equal(Product.schema.path("style").instance, "String");
  assert.equal(Product.schema.path("details.fabric").instance, "String");
  assert.equal(Product.schema.path("details.blousePiece").instance, "String");
  assert.equal(Product.schema.path("details.length").instance, "String");
  assert.equal(Product.schema.path("details.sku").instance, "String");
});

test("public product API excludes drafts while retaining existing published products", async () => {
  const originalFind = Product.find;
  let filter;
  Product.find = (query) => {
    filter = query;
    return { sort: async () => [] };
  };
  const response = { json(value) { this.body = value; } };
  try {
    await getAllProducts({}, response);
    assert.deepEqual(filter, { stock: { $gt: 0 }, published: { $ne: false } });
    assert.deepEqual(response.body, []);
  } finally {
    Product.find = originalFind;
  }
});

test("storefront shop query excludes drafts but treats legacy records as published", async () => {
  const originalFind = Product.find;
  let filter;
  Product.find = async (query) => { filter = query; return []; };
  const shopRoute = pageRoutes.stack.find((layer) => layer.route?.path === "/shop").route;
  const handler = shopRoute.stack[0].handle;
  let rendered;
  const response = { render(view, locals) { rendered = { view, locals }; } };
  try {
    await handler({ query: {}, user: null }, response);
    assert.deepEqual(filter, { stock: { $gt: 0 }, published: { $ne: false } });
    assert.equal(rendered.view, "pages/shop");
    assert.deepEqual(rendered.locals.products, []);
  } finally {
    Product.find = originalFind;
  }
});
