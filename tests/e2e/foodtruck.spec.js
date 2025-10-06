import { test, expect } from '@playwright/test';
import { stubSquarePayments } from './utils/squareStub';

test.describe('Food truck flows', () => {
  test('booking dialog sends inquiry email', async ({ page }) => {
    let payload = null;
    await page.route('**/api/messages/submit', async (route) => {
      payload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto('/book-food-truck');
    await page.getByRole('button', { name: /Book the food truck/i }).click();
    await page.getByLabel('Name / Business*').fill('Food Truck Client');
    await page.getByLabel('Email*').fill('truck@example.com');
    await page.getByLabel('Phone*').fill('6125551234');
    await page.getByLabel('Event date*').fill('2025-05-10');
    await page.getByLabel('Event location*').fill('123 Sample St');
    await page.getByLabel('Desired cuisine').fill('Wood-fired pizza');
    await page.getByLabel('Additional details').fill('Looking for dinner service.');
    await page.getByRole('button', { name: /Send inquiry/i }).click();

    await expect(page.getByRole('button', { name: 'Thanks!' })).toBeVisible();
    expect(payload).toMatchObject({
      email: 'truck@example.com',
      subject: 'Food Truck Inquiry',
      type: 'food_truck',
    });
  });

  test('deposit checkout fails without Square configuration', async ({ page }) => {
    await stubSquarePayments(page);

    let called = false;
    await page.route('**/api/food-truck/deposit', async (route) => {
      called = true;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'square-not-configured' }),
      });
    });

    await page.goto('/book-food-truck');
    await page.locator('#ft-deposit-name').fill('Deposit Client');
    await page.locator('#ft-deposit-email').fill('deposit@example.com');
    await page.locator('#ft-deposit-phone').fill('6125555678');
    await page.locator('#ft-deposit-date').fill('2025-06-15');
    await page.locator('#ft-deposit-notes').fill('Evening service.');

    const payButton = page.getByRole('button', { name: /Pay/ });
    await expect(payButton).toBeEnabled();
    await payButton.click();

    await expect(page.getByText('square-not-configured')).toBeVisible();
    expect(called).toBe(true);
  });
});
