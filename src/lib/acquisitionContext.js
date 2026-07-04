const STORAGE_KEY = 'local-effort:acquisition:v1';
const MAX_VALUE_LENGTH = 512;

const QUERY_PARAM_MAP = Object.freeze({
  utm_source: 'source',
  utm_medium: 'medium',
  utm_campaign: 'campaign',
  utm_term: 'term',
  utm_content: 'content',
  gclid: 'gclid',
  gbraid: 'gbraid',
  wbraid: 'wbraid',
});

let memoryContext = null;

function cleanValue(value) {
  if (typeof value !== 'string') return undefined;
  const cleaned = [...value]
    .filter((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint > 31 && codePoint !== 127;
    })
    .join('')
    .trim();
  return cleaned ? cleaned.slice(0, MAX_VALUE_LENGTH) : undefined;
}

function safePagePath(location) {
  const pathname = cleanValue(location?.pathname);
  return pathname?.startsWith('/') ? pathname : '/';
}

function safeReferrer(referrer) {
  if (!referrer) return undefined;
  try {
    const url = new URL(referrer);
    return cleanValue(`${url.origin}${url.pathname}`);
  } catch (_) {
    return undefined;
  }
}

function readGoogleAnalyticsIds(cookieString) {
  const cookies = Object.fromEntries(
    String(cookieString || '')
      .split(';')
      .map((part) => part.trim().split(/=(.*)/s))
      .filter(([name, value]) => name && value),
  );
  const clientMatch = cookies._ga?.match(/^GA\d+\.\d+\.(.+)$/);
  const sessionCookie = Object.entries(cookies).find(([name]) => /^_ga_.+/.test(name))?.[1];
  const sessionMatch = sessionCookie?.match(/^GS\d+\.\d+\.s?(\d+)/);

  return {
    gaClientId: cleanValue(clientMatch?.[1]),
    gaSessionId: cleanValue(sessionMatch?.[1]),
  };
}

function readStoredContext(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
    if (parsed?.firstTouch && parsed?.lastTouch) return parsed;
  } catch (_) {
    // Storage can be disabled or contain stale data; use memory instead.
  }
  return memoryContext;
}

function persistContext(storage, context) {
  memoryContext = context;
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch (_) {
    // Measurement must not interfere with the user flow.
  }
}

function buildTouch(win) {
  const params = new URLSearchParams(win.location?.search || '');
  const touch = {};

  for (const [queryName, propertyName] of Object.entries(QUERY_PARAM_MAP)) {
    const value = cleanValue(params.get(queryName));
    if (value) touch[propertyName] = value;
  }

  const referrer = safeReferrer(win.document?.referrer);
  if (referrer) touch.referrer = referrer;
  touch.landingPage = safePagePath(win.location);

  const analyticsIds = readGoogleAnalyticsIds(win.document?.cookie);
  if (analyticsIds.gaClientId) touch.gaClientId = analyticsIds.gaClientId;
  if (analyticsIds.gaSessionId) touch.gaSessionId = analyticsIds.gaSessionId;

  return touch;
}

function hasCampaignSignal(touch) {
  return Object.values(QUERY_PARAM_MAP).some((propertyName) => Boolean(touch[propertyName]));
}

/**
 * Captures first-touch attribution once and refreshes last-touch attribution
 * only when the current URL carries an explicit campaign/click identifier.
 *
 * Query strings and hash fragments are intentionally excluded from landing
 * and referrer URLs so arbitrary or sensitive URL parameters are not retained.
 */
export function captureAcquisitionContext(win = typeof window !== 'undefined' ? window : null) {
  if (!win) return null;

  const touch = buildTouch(win);
  const stored = readStoredContext(win.localStorage);
  const context = stored
    ? {
        firstTouch: stored.firstTouch,
        lastTouch: hasCampaignSignal(touch) ? touch : stored.lastTouch,
      }
    : { firstTouch: touch, lastTouch: touch };

  persistContext(win.localStorage, context);
  return context;
}

export function getAcquisitionContext(win = typeof window !== 'undefined' ? window : null) {
  return captureAcquisitionContext(win);
}

export const acquisitionStorageKey = STORAGE_KEY;
