import { test, expect } from '@playwright/test';
import { stubSquarePayments } from './utils/squareStub';

const encodeState = (payload) =>
  Buffer.from(JSON.stringify(payload), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '');

test.describe('Paikka presale', () => {
  test.beforeEach(async ({ page }) => {
    await stubSquarePayments(page);
  });

  test('checkout posts to missing /api/paikka/pay route', async ({ page }) => {
    let called = false;
    await page.route('**/api/paikka/pay', async (route) => {
      called = true;
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not Found' }),
      });
    });

    await page.goto('/paikka');
    await page.getByRole('button', { name: /Add to cart/i }).first().click();
    await page.getByLabel('First name').fill('Alex');
    await page.getByLabel('Email').fill('alex@example.com');
    await page.getByRole('button', { name: '0%' }).click();

    const payButton = page.getByRole('button', { name: /Pay/ });
    await expect(payButton).toBeEnabled();
    await payButton.click();

    await expect(page.getByText('Not Found')).toBeVisible();
    expect(called).toBe(true);
  });

  test('success page fails to finalize order without backend route', async ({ page }) => {
    const stateParam = encodeState({
      email: 'alex@example.com',
      firstName: 'Alex',
      items: [{ sku: 'SMOKED_CHICKEN', qty: 1 }],
      tipCents: 0,
    });

    await page.route('**/api/paikka/finalize', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not Found' }),
      });
    });

    await page.goto(`/paikka/success?state=${stateParam}&paymentId=test123`);
    await expect(page.getByText('Not Found')).toBeVisible();
  });

  test('resend email button fails when /api/paikka/resend is missing', async ({ page }) => {
    const stateParam = encodeState({
      email: 'alex@example.com',
      firstName: 'Alex',
      items: [{ sku: 'SMOKED_CHICKEN', qty: 1 }],
      tipCents: 0,
    });

    await page.route('**/api/paikka/finalize', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          order: { email: 'alex@example.com', oid: 'order-1', jti: 'qr-123' },
          jwt: 'token-123',
        }),
      });
    });

    let resendCalled = false;
    await page.route('**/api/paikka/resend', async (route) => {
      resendCalled = true;
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not Found' }),
      });
    });

    await page.goto(`/paikka/success?state=${stateParam}&paymentId=test123`);
    await expect(page.getByText('You are all set.')).toBeVisible();
    await page.getByRole('button', { name: /Resend email/i }).click();
    await expect(page.getByText('We could not resend the email. Try again shortly.')).toBeVisible();
    expect(resendCalled).toBe(true);
  });
});
