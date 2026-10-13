import { test, expect } from "@playwright/test";

test("admin can create, edit, upload, filter, update stock, and delete a saree", async ({ page }) => {
  const products = [];
  const savedPayloads = [];
  let nextId = 1;

  await page.addInitScript(() => localStorage.setItem("token", "admin-test-token"));
  await page.route("**/admin/products", (route) => route.fulfill({
    status: 200,
    contentType: "text/html",
    body: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/js/widgets/admin-app.css"></head><body><div id="admin-root"></div><script type="module" src="/js/widgets/admin-app.js"></script></body></html>',
  }));
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: { user: { role: "admin", name: "Test Admin" } } }));
  await page.route("**/api/products**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith("/admin/all") && request.method() === "GET") {
      return route.fulfill({ json: products });
    }
    if (url.pathname === "/api/products" && request.method() === "GET") {
      return route.fulfill({ json: products.filter((product) => product.published !== false && product.stock > 0) });
    }
    if (url.pathname.endsWith("/upload") && request.method() === "POST") {
      return route.fulfill({ json: { url: "https://images.example.test/rani-pink.png" } });
    }
    if (url.pathname === "/api/products" && request.method() === "POST") {
      const payload = request.postDataJSON();
      savedPayloads.push(payload);
      const product = { ...payload, _id: `test-product-${nextId++}`, createdAt: new Date().toISOString() };
      products.push(product);
      return route.fulfill({ status: 201, json: product });
    }
    const productId = url.pathname.split("/").at(-1);
    const index = products.findIndex((product) => product._id === productId);
    if (request.method() === "PUT" && index >= 0) {
      const payload = request.postDataJSON();
      savedPayloads.push(payload);
      products[index] = { ...products[index], ...payload };
      return route.fulfill({ json: products[index] });
    }
    if (request.method() === "DELETE" && index >= 0) {
      products.splice(index, 1);
      return route.fulfill({ json: { message: "Product deleted successfully" } });
    }
    return route.fulfill({ status: 404, json: { message: "Not found" } });
  });
  await page.goto("/admin/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await page.getByRole("button", { name: "+ Add Saree" }).click();
  await page.getByLabel("Saree name *").fill("Rani Pink Banarasi Saree");
  await page.getByLabel("Description *").fill("Handwoven silk with zari border.");
  await page.getByLabel("Category *").fill("Banarasi Saree");
  await page.getByLabel("Collection").fill("Wedding Edit");
  await page.getByLabel("Regular price (₹) *").fill("12000");
  await page.getByLabel("Discounted price (₹)").fill("10000");
  await page.getByLabel("SKU").fill("NIR-BAN-001");
  await page.getByLabel("Total stock *").fill("5");
  await page.getByLabel("Fabric").fill("Banarasi silk");
  await page.getByLabel("Blouse piece").fill("Unstitched piece included");
  await page.getByLabel("Add images").setInputFiles({
    name: "rani-pink.png",
    mimeType: "image/png",
    buffer: Buffer.from("test image data"),
  });
  await expect(page.getByText("Main image")).toBeVisible();
  await page.getByRole("button", { name: "Add saree", exact: true }).click();

  const productRow = page.locator(".admin-products-table tbody tr").filter({ hasText: "Rani Pink Banarasi Saree" });
  await expect(productRow).toContainText("Published");
  expect(savedPayloads[0]).toMatchObject({
    slug: "rani-pink-banarasi-saree",
    collectionName: "Wedding Edit",
    occasion: "",
    details: { fabric: "Banarasi silk", blousePiece: "Unstitched piece included", sku: "NIR-BAN-001" },
    images: ["https://images.example.test/rani-pink.png"],
    stock: 5,
    published: true,
  });

  await productRow.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Collection").fill("Festive Wedding Edit");
  await page.getByLabel("Published on storefront").uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".admin-products-table")).toContainText("Draft");
  const storefrontProducts = await page.evaluate(async () => (await fetch("/api/products")).json());
  expect(storefrontProducts).toHaveLength(0);

  await page.getByLabel("Status").selectOption("draft");
  const draftRow = page.locator(".admin-products-table tbody tr").filter({ hasText: "Rani Pink Banarasi Saree" });
  await expect(draftRow).toBeVisible();
  await draftRow.getByLabel("Stock for Rani Pink Banarasi Saree").fill("3");
  await draftRow.locator(".admin-inline-stock button").click();
  await expect(draftRow.getByLabel("Stock for Rani Pink Banarasi Saree")).toHaveValue("3");

  page.once("dialog", (dialog) => dialog.accept());
  await draftRow.getByRole("button", { name: "Delete" }).click();
  await expect(page.locator(".admin-products-table")).toContainText("No products yet. Add your first saree to start the catalog.");
  expect(products).toHaveLength(0);
  expect(savedPayloads).toHaveLength(3);
});
