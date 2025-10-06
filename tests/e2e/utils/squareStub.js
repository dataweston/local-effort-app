export async function stubSquarePayments(page) {
  await page.addInitScript(() => {
    const createStubCard = () => ({
      attach: async () => {},
      destroy: async () => {},
      tokenize: async () => ({ status: 'OK', token: 'stub-token' }),
    });

    const createPayments = () => ({
      card: async () => createStubCard(),
    });

    window.__SQUARE_APP_ID__ = window.__SQUARE_APP_ID__ || 'sandbox-stub-app-id';
    window.__SQUARE_LOCATION_ID__ = window.__SQUARE_LOCATION_ID__ || 'location-stub';
    window.__SQUARE_ENV__ = window.__SQUARE_ENV__ || 'sandbox';

    window.Square = window.Square || {
      payments: async () => createPayments(),
    };
  });

  await page.route(/https:\/\/(sandbox\.)?web\.squarecdn\.com\/v1\/square\.js/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.Square = window.Square || {};
window.Square.payments = window.Square.payments || (async () => ({
  card: async () => ({
    attach: async () => {},
    destroy: async () => {},
    tokenize: async () => ({ status: 'OK', token: 'stub-token' })
  })
}));`,
    });
  });
}
