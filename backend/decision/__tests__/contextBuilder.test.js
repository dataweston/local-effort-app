import { describe, expect, it, vi } from 'vitest';
import { buildDecisionContext, buildDecisionContextFromRequest, inferPageType } from '../contextBuilder';
import { logDecisionEvent } from '../eventLogger';

describe('decision context builder', () => {
  it('infers page types from known customer-facing paths', () => {
    expect(inferPageType('/')).toBe('home');
    expect(inferPageType('/product/olive-oil')).toBe('product');
    expect(inferPageType('/weekly-order')).toBe('commerce');
    expect(inferPageType('/unknown')).toBe('page');
  });

  it('builds a normalized context object from direct inputs', () => {
    const context = buildDecisionContext({
      sessionId: 'sess-123',
      occurredAt: '2026-03-29T12:00:00.000Z',
      path: '/weekly-order',
      acquisition: {
        source: 'google',
        campaign: 'spring-push',
      },
      visitor: {
        isReturning: true,
        deviceType: 'mobile',
      },
      session: {
        cartItemCount: '2',
        viewedProductSlugs: ['weekly-order', '', 'chef-special'],
      },
      constraints: {
        maxWords: '35',
        tone: 'helpful, concise',
      },
    });

    expect(context.page.type).toBe('commerce');
    expect(context.page.routeFamily).toBe('subscription');
    expect(context.acquisition.source).toBe('google');
    expect(context.acquisition.campaignClass).toBe('paid-acquisition');
    expect(context.session.cartItemCount).toBe(2);
    expect(context.session.viewedProductSlugs).toEqual(['weekly-order', 'chef-special']);
    expect(context.session.depth).toBe('deep');
    expect(context.session.hasHighIntent).toBe(true);
    expect(context.visitor.commercialMode).toBe('subscriber');
    expect(context.constraints.maxWords).toBe(35);
  });

  it('builds a context object from an express-like request', () => {
    const context = buildDecisionContextFromRequest({
      path: '/product/psyche',
      query: {
        utm_source: 'instagram',
        utm_campaign: 'olive-launch',
        cart_count: '1',
        returning: 'true',
      },
      headers: {
        referer: 'https://instagram.com',
        'x-session-id': 'sess-req-1',
        'x-device-type': 'mobile',
        'accept-language': 'en-US,en;q=0.9',
      },
    });

    expect(context.sessionId).toBe('sess-req-1');
    expect(context.page.type).toBe('product');
    expect(context.page.routeFamily).toBe('catalog');
    expect(context.acquisition.campaign).toBe('olive-launch');
    expect(context.acquisition.campaignClass).toBe('promotion');
    expect(context.acquisition.referrer).toBe('https://instagram.com');
    expect(context.visitor.isReturning).toBe(true);
    expect(context.visitor.commercialMode).toBe('consumer');
  });
});

describe('decision event logger', () => {
  it('validates and logs a structured event', () => {
    const logger = { info: vi.fn() };
    const event = logDecisionEvent({
      logger,
      event: {
        version: '1',
        eventType: 'decision.rendered',
        occurredAt: '2026-03-29T12:00:00.000Z',
        sessionId: 'sess-123',
        path: '/sale',
        strategy: 'promote',
        reasonCodes: ['sale_relevant'],
        selectedPriorityIds: ['spring-sale'],
        metadata: { surface: 'hero' },
      },
    });

    expect(event.strategy).toBe('promote');
    expect(logger.info).toHaveBeenCalledTimes(1);
  });
});
