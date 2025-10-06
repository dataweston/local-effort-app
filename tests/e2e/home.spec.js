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

test.describe('home page forms', () => {
  test('newsletter subscribe posts to /api/subscribe', async ({ page }) => {
    let requestBody = null;
    await page.route('**/api/subscribe', async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto('/');
    await page.getByPlaceholder('you@example.com').first().fill('tester@example.com');
    await page.getByRole('button', { name: 'Subscribe' }).first().click();

    await expect(page.getByText("Thanks! You’re on the list.")).toBeVisible();
    expect(requestBody).toEqual({ email: 'tester@example.com' });
  });

  test('feedback modal submits to /api/messages/submit', async ({ page }) => {
    let payload = null;
    await page.route('**/api/messages/submit', async (route) => {
      payload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto('/');
    await page.getByRole('button', { name: /provide feedback/i }).click();
    await page.getByLabel('Name').fill('Test User');
    await page.getByLabel('Email').fill('feedback@example.com');
    await page.getByLabel('Message').fill('Playwright feedback message.');
    await page.getByRole('button', { name: /Send feedback/i }).click();

    await expect(page.getByText('Thanks! Sent.')).toBeVisible();
    expect(payload).toMatchObject({
      name: 'Test User',
      email: 'feedback@example.com',
      type: 'feedback',
    });
  });
});
