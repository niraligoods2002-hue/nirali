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
    if (!(await hero.count())) {
      await expect(page.locator(".offers-ticker")).toBeVisible();
      return;
    }
    const slide = hero.locator(".advert-slide.active");
    await expect(slide).toBeVisible();
    const posterLink = slide.locator(".advert-poster-link");
    const image = posterLink.locator("img");
    await expect(image).toBeVisible();
    await expect(posterLink).toHaveAttribute("href", /^(\/|https:\/\/)/);

    const layout = await slide.evaluate((element) => {
      const box = (selector) => {
        const { top, right, bottom, left, width, height } = element.querySelector(selector).getBoundingClientRect();
        return { top, right, bottom, left, width, height };
      };
      const heroBox = document.querySelector(".advert-hero").getBoundingClientRect();
      return {
        hero: { top: heroBox.top, right: heroBox.right, bottom: heroBox.bottom, left: heroBox.left },
        link: box(".advert-poster-link"),
        image: box(".advert-poster-link img"),
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });

    expect(layout.link.width).toBeGreaterThan(0);
    expect(layout.image.height).toBeGreaterThan(0);
    expect(layout.image.top).toBeGreaterThanOrEqual(layout.hero.top);
    expect(layout.image.right).toBeLessThanOrEqual(layout.hero.right);
    expect(layout.image.bottom).toBeLessThanOrEqual(layout.hero.bottom);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.link.left).toBeGreaterThanOrEqual(layout.hero.left);
    expect(layout.link.right).toBeLessThanOrEqual(layout.hero.right);

    await hero.screenshot({ path: testInfo.outputPath("hero.png") });
  });
}
