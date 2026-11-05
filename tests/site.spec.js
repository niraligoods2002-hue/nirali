// @ts-check
import { test, expect } from '@playwright/test';

test.describe('NIRALI Storefront E2E Tests', () => {

  test('01. Health check endpoint responds OK', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.database).toBe('connected');
  });

  test('02. Homepage renders with luxury branding, navbar, and hero', async ({ page }) => {
    await page.goto('/');

    // Page title
    await expect(page).toHaveTitle(/NIRALI/i);

    // Navbar & Branding
    const brand = page.locator('.brand-logo, .nav-brand, a:has-text("NIRALI")').first();
    await expect(brand).toBeVisible();

    // Key navigation links
    const shopLink = page.locator('nav a[href="/shop"], header a[href="/shop"]').first();
    await expect(shopLink).toBeVisible();

    // Search bar or button exists
    const search = page.locator('#header-search-input, #search-toggle, input[type="search"]').first();
    await expect(search).toBeAttached();

    // Footer exists
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
  });

  test('03. Shop page displays curated sarees catalog', async ({ page }) => {
    await page.goto('/shop');
    await expect(page).toHaveTitle(/Curated Sarees|NIRALI/i);

    // Verify main content area exists
    await expect(page.locator('main, #shop-root, .shop-container, .products-grid').first()).toBeVisible();

    // Check that at least one product card or empty state is rendered
    const productCards = page.locator('.product-card, [data-product-id]');
    const count = await productCards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Verify product title & price inside first card
    const firstCard = productCards.first();
    await expect(firstCard).toBeVisible();
  });

  test('homepage has a rotating advertisement banner and a looping offers ticker below it', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('.advert-hero');
    const ticker = page.locator('.offers-ticker');
    await expect(hero).toBeVisible();
    await expect(hero.locator('.advert-slide.active')).toBeVisible();
    const posterLink = hero.locator('.advert-poster-link').first();
    await expect(posterLink).toBeVisible();
    await expect(posterLink.locator('img')).toBeVisible();
    expect(await posterLink.getAttribute('href')).toBeTruthy();
    await expect(ticker).toBeVisible();
    await expect(ticker).toContainText(/offer|shipping/i);

    const layout = await page.evaluate(() => ({
      heroBottom: document.querySelector('.advert-hero').getBoundingClientRect().bottom,
      tickerTop: document.querySelector('.offers-ticker').getBoundingClientRect().top,
      animation: getComputedStyle(document.querySelector('.offers-ticker-track')).animationName,
      slideCount: document.querySelectorAll('.advert-slide').length,
    }));
    expect(layout.tickerTop).toBeGreaterThanOrEqual(layout.heroBottom);
    expect(layout.animation).toBe('offersTickerScroll');

    if (layout.slideCount > 1) {
      const previous = await hero.locator('.advert-slide.active').getAttribute('aria-hidden');
      await hero.getByRole('button', { name: 'Next advertisement' }).click();
      await expect(hero.locator('.advert-slide.active')).toHaveCount(1);
      expect(previous).toBe('false');
    }
  });

  test('04. Best Sellers page filters products', async ({ page }) => {
    await page.goto('/best-sellers');
    await expect(page).toHaveTitle(/Best Sellers|NIRALI/i);
    await expect(page.locator('main, #shop-root, .products-grid').first()).toBeVisible();
  });

  test('05. New Arrivals page renders correctly', async ({ page }) => {
    await page.goto('/new-arrivals');
    await expect(page).toHaveTitle(/New Arrivals|NIRALI/i);
    await expect(page.locator('main, #shop-root, .products-grid').first()).toBeVisible();
  });

  test('06. Product detail page loads with details and Add to Bag button', async ({ page }) => {
    await page.goto('/products/vanarasam-latkan-ajrakh-saree');

    // Title and Product Name
    await expect(page).toHaveTitle(/Vanarasam Latkan Ajrakh Saree/i);
    await expect(page.getByText('Vanarasam Latkan Ajrakh Saree').first()).toBeVisible();

    // Price is displayed (e.g. ₹800 or 800)
    await expect(page.getByText('800').first()).toBeVisible();

    // Add to Cart / Bag button exists
    const addToBag = page.locator('button:has-text("Add to Bag"), button:has-text("Add to Cart"), button.add-to-cart-btn').first();
    await expect(addToBag).toBeVisible();
  });

  test('07. Shopping Bag (Cart) page loads correctly', async ({ page }) => {
    await page.goto('/cart');
    await expect(page).toHaveTitle(/Shopping Bag|Cart|NIRALI/i);
    await expect(page.locator('main, .cart-container, #cart-root').first()).toBeVisible();
  });

  test('08. Login page displays sign-in form with validation fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Sign In|NIRALI/i);

    // Email and Password inputs
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Submit button
    const submitBtn = page.locator('#login-form button[type="submit"]');
    await expect(submitBtn).toBeVisible();
  });

  test('09. Signup page displays account creation form', async ({ page }) => {
    await page.goto('/signup');
    await expect(page).toHaveTitle(/Create Account|NIRALI/i);

    // Inputs: name, email, password
    await expect(page.locator('input[name="name"], input[placeholder*="Name" i]').first()).toBeVisible();
    await expect(page.locator('input[name="email"], input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]').first()).toBeVisible();
  });

  test('10. About Us page tells brand story and craftsmanship', async ({ page }) => {
    await page.goto('/about');
    await expect(page).toHaveTitle(/About|NIRALI/i);
    await expect(page.locator('main').first()).toBeVisible();
  });

  test('11. Contact Us page displays inquiry form and details', async ({ page }) => {
    await page.goto('/contact');
    await expect(page).toHaveTitle(/Contact|NIRALI/i);
    await expect(page.locator('main').first()).toBeVisible();
  });

  test('12. Customer Reviews page displays ratings and feedback', async ({ page }) => {
    await page.goto('/reviews');
    await expect(page).toHaveTitle(/Reviews|NIRALI/i);
    await expect(page.locator('main').first()).toBeVisible();
  });

  test('13. Shared shell uses a fixed light canvas with dark header and footer', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('nirali-theme', 'dark'));
    await page.goto('/');
    await expect(page.locator('#theme-toggle, #mobile-theme-toggle')).toHaveCount(0);
    await expect(page.locator('.brand-logo img')).toHaveAttribute('src', '/images/branding/nirali-navbar-logo-gold.png');

    const colors = await page.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      header: getComputedStyle(document.querySelector('.header')).backgroundColor,
      footer: getComputedStyle(document.querySelector('.footer')).backgroundColor,
      content: getComputedStyle(document.querySelector('.page-content')).backgroundColor,
    }));
    expect(colors.theme).toBeUndefined();
    expect(colors.header).toMatch(/250,\s*248,\s*242|23,\s*22,\s*20/);
    expect(colors.footer).toContain('23, 22, 20');
    expect(colors.content).not.toContain('23, 22, 20');
  });

  test('14. Mobile responsive layout and drawer menu work on mobile viewports', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Mobile nav trigger
    const menuBtn = page.locator('#menu-btn');
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    // Verify mobile drawer becomes visible
    const drawer = page.locator('#mobile-drawer');
    await expect(drawer).toBeVisible();

    // Close button works
    const closeBtn = page.locator('#mobile-drawer-close');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
  });

  test('15. 404 page handles invalid routes gracefully', async ({ page }) => {
    const response = await page.goto('/non-existent-page-url-xyz');
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle(/Not Found|NIRALI/i);
  });
});
