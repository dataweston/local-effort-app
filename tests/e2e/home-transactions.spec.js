import { test, expect } from '@playwright/test';

const stubCommonHomeApis = async (page) => {
  await page.route('**/api/search-images**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ images: [] }),
    });
  });

  await page.route('**/api/feedback**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    });
  });
};

const goToSection = async (page, index) => {
  await page.waitForFunction(() => typeof window.scrollToPage === 'function');
  await page.evaluate((pageIndex) => window.scrollToPage(pageIndex), index);
};

test.describe('home page transactions and forms', () => {
  test('small events deposit checkout starts from the home page', async ({ page }) => {
    await page.addInitScript(() => {
      window.__openedUrls = [];
      window.open = (url, target, features) => {
        window.__openedUrls.push({ url, target, features });
        return null;
      };
    });

    await stubCommonHomeApis(page);

    const slotDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const slotDateString = slotDate.toISOString().slice(0, 10);
    let holds = [];
    let estimatePayload = null;
    let holdPayload = null;
    let checkoutPayload = null;

    const estimateResponse = {
      id: 'estimate-1',
      guestCount: 12,
      staffingCount: 2,
      staffingCostCents: 0,
      subtotalCents: 120000,
      estimateMinCents: 100000,
      estimateMaxCents: 150000,
      depositAmountCents: 18000,
      depositPercent: 15,
      depositStatus: 'unpaid',
      lastEditedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await page.route('**/api/small-events/availability**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          slots: [
            {
              id: 'slot-1',
              date: slotDateString,
              type: 'dinner',
              status: 'open',
              notes: 'Test slot',
              source: 'manual',
            },
          ],
          holds,
        }),
      });
    });

    await page.route('**/api/small-events/estimates', async (route) => {
      estimatePayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          estimate: estimateResponse,
          hold: null,
          sessionToken: 'session-token-1',
        }),
      });
    });

    await page.route('**/api/small-events/holds', async (route) => {
      holdPayload = route.request().postDataJSON();
      const hold = {
        slotId: holdPayload.slotId,
        status: 'held',
        holdUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      holds = [hold];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          estimate: estimateResponse,
          hold,
        }),
      });
    });

    await page.route('**/api/small-events/checkout', async (route) => {
      checkoutPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://checkout.example.com' }),
      });
    });

    await page.goto('/');
    await goToSection(page, 2);
    await page.getByRole('button', { name: 'dinner party in my home' }).click();

    const dialog = page.locator('.small-events-dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder('Full name').fill('Jamie Tester');
    await dialog.getByPlaceholder('name@example.com').first().fill('jamie@example.com');
    await dialog.getByPlaceholder('ex: 18').fill('12');

    await dialog.getByRole('button', { name: 'Save estimate' }).click();
    await expect(dialog.getByText('Estimate saved.')).toBeVisible();

    const availability = dialog.locator('.availability-calendar');
    await availability.scrollIntoViewIfNeeded();
    const openDay = availability.locator('button.availability-day[data-status="open"]').first();
    await openDay.scrollIntoViewIfNeeded();
    await openDay.click();

    const holdButton = dialog.getByRole('button', { name: /Hold this date/i });
    await expect(holdButton).toBeEnabled();
    await holdButton.click();

    const payButton = dialog.getByRole('button', { name: /Pay deposit via Square/i });
    await expect(payButton).toBeEnabled();
    await payButton.click();

    await expect(dialog.getByRole('button', { name: /Deposit started/i })).toBeVisible();

    expect(estimatePayload).toMatchObject({
      type: 'dinner',
      contactName: 'Jamie Tester',
      contactEmail: 'jamie@example.com',
      guestCount: '12',
    });
    expect(holdPayload).toMatchObject({ estimateId: 'estimate-1', slotId: 'slot-1' });
    expect(checkoutPayload).toEqual({ estimateId: 'estimate-1' });

    const openedUrls = await page.evaluate(() => window.__openedUrls);
    expect(openedUrls[0]?.url).toContain('checkout.example.com');
  });

  test('weekly meals waitlist submits from the home page', async ({ page }) => {
    await stubCommonHomeApis(page);

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
    await goToSection(page, 1);
    await page.getByRole('button', { name: /Join the waitlist/i }).click();

    const dialog = page.locator('div[role="dialog"]').filter({ hasText: 'Join the waiting list' });
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('Name').fill('Waitlist Tester');
    await dialog.getByLabel('Email').fill('waitlist@example.com');
    await dialog.getByLabel('Phone number').fill('555-123-9999');
    await dialog.getByLabel('Family size').fill('2 adults');
    await dialog.getByLabel('Days per week').fill('4');
    await dialog.getByLabel('Meals per day').fill('Dinner');
    await dialog.getByLabel('Questions for the team').fill('Looking forward to it!');

    await dialog.getByRole('button', { name: /Join waitlist/i }).click();
    await expect(dialog.getByText("Thanks! We'll be in touch.")).toBeVisible();

    expect(payload).toMatchObject({
      name: 'Waitlist Tester',
      email: 'waitlist@example.com',
      type: 'meal-prep-waitlist',
      subject: 'Meal Prep Waitlist signup',
    });
  });
});
