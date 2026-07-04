import { beforeEach, describe, expect, it, vi } from 'vitest';

function makeStorage() {
  const values = new Map();
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, value)),
  };
}

function makeWindow({
  search = '',
  pathname = '/',
  referrer = '',
  cookie = '_ga=GA1.1.12345.67890; _ga_TEST=GS2.1.s98765$o1',
  storage = makeStorage(),
} = {}) {
  return {
    location: { search, pathname },
    document: { referrer, cookie },
    localStorage: storage,
  };
}

describe('acquisitionContext', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('persists first and last touch without retaining arbitrary query strings', async () => {
    const { captureAcquisitionContext } = await import('../src/lib/acquisitionContext.js');
    const storage = makeStorage();
    const first = makeWindow({
      search: '?utm_source=google&utm_medium=cpc&gclid=click-1&email=private@example.com',
      pathname: '/meal-prep-intake',
      referrer: 'https://www.google.com/search?q=private',
      storage,
    });

    const context = captureAcquisitionContext(first);

    expect(context.firstTouch).toMatchObject({
      source: 'google',
      medium: 'cpc',
      gclid: 'click-1',
      landingPage: '/meal-prep-intake',
      referrer: 'https://www.google.com/search',
      gaClientId: '12345.67890',
      gaSessionId: '98765',
    });
    expect(JSON.stringify(context)).not.toContain('private@example.com');
  });

  it('keeps first touch and replaces last touch only for explicit acquisition signals', async () => {
    const { captureAcquisitionContext } = await import('../src/lib/acquisitionContext.js');
    const storage = makeStorage();
    captureAcquisitionContext(
      makeWindow({ search: '?utm_source=google', pathname: '/book', storage }),
    );

    const direct = captureAcquisitionContext(makeWindow({ pathname: '/sale', storage }));
    expect(direct.lastTouch.source).toBe('google');
    expect(direct.lastTouch.landingPage).toBe('/book');

    const later = captureAcquisitionContext(
      makeWindow({ search: '?utm_source=newsletter', pathname: '/sale', storage }),
    );
    expect(later.firstTouch.source).toBe('google');
    expect(later.lastTouch.source).toBe('newsletter');
    expect(later.lastTouch.landingPage).toBe('/sale');
  });
});

describe('trackEvent', () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn(() => Promise.resolve({ ok: true }));
  });

  it('preserves the server event and emits a PII-free standardized GA4 event', async () => {
    const storage = makeStorage();
    global.window = makeWindow({
      search: '?utm_source=google&utm_campaign=supper',
      pathname: '/sale',
      storage,
    });
    window.gtag = vi.fn();
    const { trackEvent } = await import('../src/lib/trackEvent.js');

    trackEvent('order.placed', {
      store: 'sale',
      sessionId: 'checkout-1',
      paymentId: 'payment-1',
      amountCents: 12500,
      email: 'private@example.com',
    });

    expect(window.gtag).toHaveBeenCalledWith('event', 'purchase', {
      store: 'sale',
      currency: 'USD',
      value: 125,
      transaction_id: 'payment-1',
    });
    expect(JSON.stringify(window.gtag.mock.calls)).not.toContain('private@example.com');

    const request = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(request.meta.email).toBe('private@example.com');
    expect(request.meta.acquisition.firstTouch.source).toBe('google');
  });

  it('does not duplicate July Dinner GA4 events', async () => {
    global.window = makeWindow();
    window.gtag = vi.fn();
    const { trackEvent } = await import('../src/lib/trackEvent.js');

    trackEvent('order.placed', { store: 'july-dinner', sessionId: 'checkout-2' });

    expect(window.gtag).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledOnce();
  });
});
