import { test, expect } from '@playwright/test';
import { stubSquarePayments } from './utils/squareStub';

test.describe('crowdfunding checkout', () => {
  test.beforeEach(async ({ page }) => {
    await stubSquarePayments(page);
  });

  test('checkout form posts to /api/crowdfund/checkout', async ({ page }) => {
    const requests = [];
    await page.route('**/api/crowdfund/**', async (route) => {
      requests.push(route.request().url());
      if (route.request().url().endsWith('/checkout')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto('/crowdfunding');
    await page.getByRole('button', { name: 'I want pizza' }).click();
    await page.locator('#cf-name').fill('Crowdfund Tester');
    await page.locator('#cf-email').fill('crowdfund@example.com');
    await page.locator('#cf-phone').fill('555-555-1234');
    await page.locator('#pizza-qty').fill('1');

    const buyButton = page.getByRole('button', { name: /Buy/ });
    await expect(buyButton).toBeEnabled();
    await buyButton.click();

    expect(requests.some((url) => url.endsWith('/checkout'))).toBe(true);
    expect(requests.some((url) => url.endsWith('/contribute'))).toBe(false);
    await expect(page.getByText('Thanks! Your contribution has been processed.')).toBeVisible();
  });
});
