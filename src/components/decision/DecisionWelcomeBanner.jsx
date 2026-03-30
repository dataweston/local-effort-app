import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../store/cart/CartContext';
import '../../styles/decision-welcome-banner.css';

const ELIGIBLE_PREFIXES = ['/', '/sale', '/weekly-order', '/pizza-party', '/psyche', '/product/'];
const VIEWED_PRODUCTS_KEY = 'le_decision_viewed_products';

function isEligiblePath(pathname) {
  if (!pathname) return false;
  if (pathname === '/') return true;
  return ELIGIBLE_PREFIXES.some((prefix) => prefix !== '/' && pathname.startsWith(prefix));
}

function inferPageType(pathname) {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/sale')) return 'sale';
  if (pathname.startsWith('/weekly-order')) return 'commerce';
  if (pathname.startsWith('/pizza-party')) return 'service';
  if (pathname.startsWith('/product/') || pathname.startsWith('/psyche')) return 'product';
  return 'page';
}

function getSessionId() {
  try {
    const existing = window.sessionStorage.getItem('le_decision_session_id');
    if (existing) return existing;
    const created = `web-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem('le_decision_session_id', created);
    return created;
  } catch (_err) {
    return 'web-session';
  }
}

function readReturningState() {
  try {
    return window.localStorage.getItem('le_decision_returning') === '1';
  } catch (_err) {
    return false;
  }
}

function markReturningState() {
  try {
    window.localStorage.setItem('le_decision_returning', '1');
  } catch (_err) {
    // ignore storage failures
  }
}

function inferViewedProductSlug(pathname) {
  if (!pathname) return null;
  if (pathname === '/psyche') return 'psyche';
  if (!pathname.startsWith('/product/')) return null;
  const [, productSlug] = pathname.split('/').filter(Boolean);
  return productSlug || null;
}

function readViewedProducts() {
  try {
    const raw = window.sessionStorage.getItem(VIEWED_PRODUCTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (_err) {
    return [];
  }
}

function rememberViewedProduct(pathname) {
  const current = inferViewedProductSlug(pathname);
  const existing = readViewedProducts();
  if (!current) return existing;

  const next = [current, ...existing.filter((entry) => entry !== current)].slice(0, 5);
  try {
    window.sessionStorage.setItem(VIEWED_PRODUCTS_KEY, JSON.stringify(next));
  } catch (_err) {
    // ignore storage failures
  }
  return next;
}

async function postDecisionEvent(payload) {
  try {
    await fetch('/api/decision/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (_err) {
    // ignore telemetry failures on the customer surface
  }
}

export function DecisionWelcomeBanner() {
  const location = useLocation();
  const { totalQty } = useCart();
  const [decision, setDecision] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const renderLoggedRef = useRef(false);

  const eligible = isEligiblePath(location.pathname);
  const dismissalKey = useMemo(() => `le_decision_dismissed:${location.pathname}`, [location.pathname]);

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(dismissalKey) === '1');
    } catch (_err) {
      setDismissed(false);
    }
    renderLoggedRef.current = false;
  }, [dismissalKey]);

  useEffect(() => {
    if (!eligible || dismissed) {
      setDecision(null);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams(location.search || '');
    const sessionId = getSessionId();
    const returning = readReturningState();
    const viewedProductSlugs = rememberViewedProduct(location.pathname);
    markReturningState();

    const payload = {
      sessionId,
      path: location.pathname,
      pageType: inferPageType(location.pathname),
      acquisition: {
        source: params.get('utm_source') || undefined,
        campaign: params.get('utm_campaign') || undefined,
        medium: params.get('utm_medium') || undefined,
        term: params.get('utm_term') || undefined,
        referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
      },
      visitor: {
        isReturning: returning,
        deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop',
        language: navigator.language,
      },
      session: {
        cartItemCount: totalQty || 0,
        viewedProductSlugs,
      },
      constraints: {
        maxWords: 28,
        tone: 'helpful, sharp, modern, concise',
      },
    };

    fetch('/api/decision/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data || data.assignment?.variant === 'control') {
          setDecision(null);
          return;
        }
        setDecision(data);
      })
      .catch(() => {
        setDecision(null);
      });

    return () => controller.abort();
  }, [dismissed, eligible, location.pathname, location.search, totalQty]);

  useEffect(() => {
    if (!decision || renderLoggedRef.current) return;
    renderLoggedRef.current = true;
    void postDecisionEvent({
      version: '1',
      eventType: 'decision.rendered',
      occurredAt: new Date().toISOString(),
      sessionId: decision.context.sessionId,
      path: decision.context.page.path,
      strategy: decision.selected.strategy,
      assignment: decision.assignment,
      reasonCodes: decision.selected.reasonCodes,
      selectedPriorityIds: decision.selected.businessPriorities.map((entry) => entry.id),
      metadata: { surface: 'inline-banner' },
    });
  }, [decision]);

  if (!eligible || dismissed || !decision) return null;

  const handleDismiss = () => {
    try {
      window.sessionStorage.setItem(dismissalKey, '1');
    } catch (_err) {
      // ignore
    }
    setDismissed(true);
    void postDecisionEvent({
      version: '1',
      eventType: 'decision.dismissed',
      occurredAt: new Date().toISOString(),
      sessionId: decision.context.sessionId,
      path: decision.context.page.path,
      strategy: decision.selected.strategy,
      assignment: decision.assignment,
      reasonCodes: decision.selected.reasonCodes,
      selectedPriorityIds: decision.selected.businessPriorities.map((entry) => entry.id),
      metadata: { surface: 'inline-banner' },
    });
  };

  const handleActionClick = (href) => {
    void postDecisionEvent({
      version: '1',
      eventType: 'decision.clicked',
      occurredAt: new Date().toISOString(),
      sessionId: decision.context.sessionId,
      path: decision.context.page.path,
      strategy: decision.selected.strategy,
      assignment: decision.assignment,
      reasonCodes: decision.selected.reasonCodes,
      selectedPriorityIds: decision.selected.businessPriorities.map((entry) => entry.id),
      metadata: { surface: 'inline-banner', href },
    });
  };

  return (
    <section className="decision-welcome-banner" aria-label="Guided welcome">
      <div className="decision-welcome-banner__inner">
        <div className="decision-welcome-banner__copy">
          <span className="decision-welcome-banner__eyebrow">Adaptive Guide</span>
          <p>{decision.selected.welcomeText}</p>
          <div className="decision-welcome-banner__meta">
            <span>{decision.selected.strategy}</span>
            <span>{decision.context.visitor.commercialMode || 'unknown'}</span>
          </div>
        </div>
        <div className="decision-welcome-banner__actions">
          {decision.selected.suggestedActions.slice(0, 2).map((action) => (
            <Link
              key={`${action.label}-${action.href}`}
              className="decision-welcome-banner__button"
              onClick={() => handleActionClick(action.href)}
              to={action.href}
            >
              {action.label}
            </Link>
          ))}
          <button type="button" className="decision-welcome-banner__dismiss" onClick={handleDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </section>
  );
}

export default DecisionWelcomeBanner;
