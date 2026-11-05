// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Storefront Purchase & Cart Click-Through E2E Flow', () => {

  test('01. User can browse shop, click a saree, add it to bag, and verify in cart', async ({ page }) => {
    // 1. Visit shop page
    await page.goto('/shop');
    await expect(page).toHaveTitle(/Curated Sarees|NIRALI/i);

    // 2. Click the first product card title
    const firstProduct = page.locator('.product-card, [data-product-id]').first();
    await expect(firstProduct).toBeVisible();
    
    const productTitleLink = firstProduct.locator('.product-card-title a, a[href^="/products/"]').first();
    await expect(productTitleLink).toBeVisible();
    await productTitleLink.click();

    // 3. Arrive on product detail page
    await page.waitForURL(/\/products\/[\w-]+/);
    await expect(page.locator('.product-detail-layout, .product-purchase-row').first()).toBeVisible();

    // 4. Click "Add to Bag"
    const addToBagBtn = page.locator('.product-add-bag-btn, button:has-text("Add to Bag")').first();
    await expect(addToBagBtn).toBeVisible();
    await addToBagBtn.click();

    // 5. Verify button feedback
    await expect(addToBagBtn).toContainText(/Added/i);

    // 6. Verify cart badge in header has incremented
    const cartBadge = page.locator('.cart-badge');
    await expect(cartBadge).toBeVisible();
    const count = parseInt((await cartBadge.textContent()) || '0', 10);
    expect(count).toBeGreaterThanOrEqual(1);

    // 7. Click on Cart / Bag button in header
    const cartBtn = page.locator('.cart-btn, a[href="/cart"]').first();
    await cartBtn.click();
    await page.waitForURL(/\/cart/);
    await expect(page).toHaveTitle(/Shopping Bag|Cart|NIRALI/i);

    // 8. Verify the item appears in the cart layout
    const cartItem = page.locator('.cart-item').first();
    await expect(cartItem).toBeVisible();

    // 9. Verify Proceed to Checkout button is visible and clickable
    const checkoutBtn = page.locator('button:has-text("Proceed to Checkout")');
    await expect(checkoutBtn).toBeVisible();
    await checkoutBtn.click();

    // 10. As guest, should direct to login with redirect param
    await page.waitForURL(/\/login\?redirect=%2Fcheckout|\/login\?redirect=\/checkout|\/checkout/);
  });

  test('02. Direct Buy Now click immediately initiates checkout flow', async ({ page }) => {
    await page.goto('/products/vanarasam-latkan-ajrakh-saree');
    await expect(page).toHaveTitle(/Vanarasam Latkan Ajrakh Saree/i);

    // Click "Buy Now" button
    const buyNowBtn = page.locator('.product-buy-now-btn, button:has-text("Buy Now")').first();
    await expect(buyNowBtn).toBeVisible();
    await buyNowBtn.click();

    // Directs to checkout (or login with checkout redirect for guest)
    await page.waitForURL(/\/login\?redirect=%2Fcheckout|\/login\?redirect=\/checkout|\/checkout/);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });

  test('03. User can increment quantity and remove items in the cart', async ({ page }) => {
    // Add product to cart first
    await page.goto('/products/vanarasam-latkan-ajrakh-saree');
    const addToBagBtn = page.locator('.product-add-bag-btn').first();
    await addToBagBtn.click();
    await expect(addToBagBtn).toContainText(/Added/i);

    // Go to cart
    await page.goto('/cart');
    const cartItem = page.locator('.cart-item').first();
    await expect(cartItem).toBeVisible();

    // Check quantity stepper
    const qtySpan = cartItem.locator('.quantity-selector span');
    await expect(qtySpan).toHaveText('1');

    // Click increment '+'
    const plusBtn = cartItem.locator('.quantity-selector button:has-text("+")');
    await plusBtn.click();
    await expect(qtySpan).toHaveText('2');

    // Click remove button
    const removeBtn = cartItem.locator('button.remove-btn');
    await removeBtn.click();

    // Cart items should now be empty or cart-empty message displayed
    await expect(page.locator('.cart-item')).toHaveCount(0);
  });

  test('04. Quick Add to Bag click directly from shop grid works', async ({ page }) => {
    await page.goto('/shop');
    const firstProduct = page.locator('.product-card').first();
    await expect(firstProduct).toBeVisible();

    // Click card-level "Add to Bag"
    const quickAddBtn = firstProduct.locator('.product-add-cart-btn').first();
    await expect(quickAddBtn).toBeVisible();
    await quickAddBtn.click();

    // Button shows "Added to Bag ✓"
    await expect(quickAddBtn).toContainText(/Added/i);

    // Header badge updates
    const cartBadge = page.locator('.cart-badge');
    await expect(cartBadge).toBeVisible();
    const count = parseInt((await cartBadge.textContent()) || '0', 10);
    expect(count).toBeGreaterThanOrEqual(1);
  });

});
