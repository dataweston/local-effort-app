const resolveStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage || null;
  } catch (_) {
    return null;
  }
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${rand}`;
};

export const getOrCreateCheckoutAttemptId = (storageKey) => {
  if (!storageKey) {
    return generateId();
  }
  const storage = resolveStorage();
  if (!storage) {
    return generateId();
  }
  const existing = storage.getItem(storageKey);
  if (existing && existing.trim()) {
    return existing;
  }
  const next = generateId();
  storage.setItem(storageKey, next);
  return next;
};

export const clearCheckoutAttemptId = (storageKey) => {
  const storage = resolveStorage();
  if (!storage || !storageKey) return;
  storage.removeItem(storageKey);
};
