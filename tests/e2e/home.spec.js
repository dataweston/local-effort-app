import { test, expect } from '@playwright/test';

// Basic home page smoke test
// Assumes dev server or static preview is running at baseURL

test('home page loads and has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Local Effort/i);
  await expect(page.locator('body')).toBeVisible();
});

// Example of checking a navigation link
// (Adjust selectors if needed.)
test('navigation to pricing page', async ({ page }) => {
  await page.goto('/');
  const pricingLink = page.getByRole('link', { name: /pricing/i });
  if (await pricingLink.isVisible()) {
    await pricingLink.click();
    await expect(page).toHaveURL(/pricing/);
  }
});
