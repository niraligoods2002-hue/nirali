import { test, expect } from "@playwright/test";

const viewports = [
  { name: "small phone", width: 360, height: 800 },
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];

for (const viewport of viewports) {
  test(`homepage poster layout fits on ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    const hero = page.locator(".advert-hero");
    const slide = hero.locator(".advert-slide.active");
    await expect(slide).toBeVisible();
    await expect(slide.locator(".advert-artwork img")).toBeVisible();
    await expect(slide.locator(".advert-title")).toBeVisible();

    const layout = await slide.evaluate((element) => {
      const box = (selector) => {
        const { top, right, bottom, left, width, height } = element.querySelector(selector).getBoundingClientRect();
        return { top, right, bottom, left, width, height };
      };
      const heroBox = document.querySelector(".advert-hero").getBoundingClientRect();
      return {
        hero: { top: heroBox.top, right: heroBox.right, bottom: heroBox.bottom, left: heroBox.left },
        artwork: box(".advert-artwork"),
        image: box(".advert-artwork img"),
        copy: box(".advert-copy"),
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });

    expect(layout.artwork.width).toBeGreaterThan(0);
    expect(layout.image.height).toBeGreaterThan(0);
    expect(layout.image.top).toBeGreaterThanOrEqual(layout.artwork.top);
    expect(layout.image.right).toBeLessThanOrEqual(layout.artwork.right);
    expect(layout.image.bottom).toBeLessThanOrEqual(layout.artwork.bottom);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.artwork.left).toBeGreaterThanOrEqual(layout.hero.left);
    expect(layout.artwork.right).toBeLessThanOrEqual(layout.hero.right);
    if (viewport.width <= 700) {
      expect(layout.artwork.bottom).toBeLessThanOrEqual(layout.copy.top);
      expect(layout.copy.bottom).toBeLessThanOrEqual(layout.hero.bottom - 45);
    }

    await hero.screenshot({ path: testInfo.outputPath("hero.png") });
  });
}
