/*
 * HYVR end-to-end smoke spec (Playwright). Portable; runs against the local preview
 * or any EDS environment. Requires: npm i -D @playwright/test && npx playwright install.
 * Run: PREVIEW=http://localhost:3001 npx playwright test test/e2e.spec.mjs
 * (Documented gap G-BP1-5: Playwright is not vendored here to keep the repo lean.)
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.PREVIEW || 'http://localhost:3001';

test('home renders hero and featured grid', async ({ page }) => {
  await page.goto(BASE);
  await expect(page.locator('h1')).toContainText('Enter the Hyvr');
  await expect(page.locator('.product-grid-items .product-card')).toHaveCount(4);
});

test('PLP filters live by category', async ({ page }) => {
  await page.goto(`${BASE}/products`);
  await expect(page.locator('.product-card')).toHaveCount(9);
  await page.getByLabel('AR Glasses').check();
  await expect(page.locator('.product-grid-status')).toContainText('1 product');
});

test('PDP shows price, specs and JSON-LD', async ({ page }) => {
  await page.goto(`${BASE}/product/aurora-x1`);
  await expect(page.locator('.product-hero-price')).toContainText('$1,299');
  await expect(page.locator('.product-specs-table tbody tr')).not.toHaveCount(0);
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(ld)['@type']).toBe('Product');
});

test('accessibility: skip link and single h1 per page', async ({ page }) => {
  await page.goto(BASE);
  await expect(page.locator('.skip-to-main')).toHaveCount(1);
  await expect(page.locator('main h1')).toHaveCount(1);
});
