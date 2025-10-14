import { getApps, initializeApp } from 'firebase/app';
import {
  collection,
  doc,
  getFirestore,
  limit as limitQuery,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import devConsole from './devConsole.js';

let cachedApp = null;
let initAttempted = false;

const getEnv = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env;
  }
  return {};
};

const readEnvValue = (suffix) => {
  const env = getEnv();
  return (
    env[`VITE_FIREBASE_${suffix}`] ||
    env[`NEXT_PUBLIC_FIREBASE_${suffix}`] ||
    env[`PUBLIC_FIREBASE_${suffix}`] ||
    null
  );
};

const buildFirebaseConfig = () => {
  const apiKey = readEnvValue('API_KEY');
  const authDomain = readEnvValue('AUTH_DOMAIN');
  const projectId = readEnvValue('PROJECT_ID');
  const appId = readEnvValue('APP_ID');
  const messagingSenderId = readEnvValue('MESSAGING_SENDER_ID');

  if (!apiKey || !authDomain || !projectId || !appId || !messagingSenderId) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    messagingSenderId,
  };
};

export const getFirebaseAppInstance = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  if (cachedApp) {
    return cachedApp;
  }
  if (initAttempted) {
    return null;
  }
  initAttempted = true;

  const config = buildFirebaseConfig();
  if (!config) {
    devConsole.warn?.('[firebase] missing client configuration for crowdfunding');
    return null;
  }

  try {
    cachedApp = getApps()[0] ?? initializeApp(config);
    return cachedApp;
  } catch (error) {
    cachedApp = null;
    devConsole.warn?.('[firebase] failed to initialize client app', error);
    return null;
  }
};

const normalizeTimestamp = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch (error) {
      return null;
    }
  }
  return null;
};

const sanitizeFeedbackText = (value) =>
  String(value || '')
    .replace(/\r/g, '')
    .trim();

const sanitizeFeedbackRating = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const rounded = Math.round(num);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
};

export const watchCrowdfundingTotals = ({ onUpdate, onError } = {}) => {
  const app = getFirebaseAppInstance();
  if (!app) {
    return null;
  }

  try {
    const firestore = getFirestore(app);
    const totalsRef = doc(firestore, 'aggregates', 'crowdfunding');

    return onSnapshot(
      totalsRef,
      (snapshot) => {
        const raw = snapshot.exists() ? snapshot.data() || {} : {};
        const pizzas = Number(raw.pizzas);
        const backers = Number(raw.backers);
        const goal = Number(raw.goal);
        const updatedAt = normalizeTimestamp(raw.updatedAt);
        if (onUpdate) {
          onUpdate({
            pizzas: Number.isFinite(pizzas) ? pizzas : null,
            backers: Number.isFinite(backers) ? backers : null,
            goal: Number.isFinite(goal) && goal > 0 ? goal : null,
            updatedAt,
          });
        }
      },
      (error) => {
        devConsole.warn?.('[firebase] crowdfunding totals listener error', error);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    devConsole.warn?.('[firebase] crowdfunding totals listener failed', error);
    if (onError) onError(error);
    return null;
  }
};

export const watchPizzaFeedback = ({ limit = 8, onUpdate, onError } = {}) => {
  const app = getFirebaseAppInstance();
  if (!app) {
    return null;
  }

  const normalizedLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 30) : 8;

  try {
    const firestore = getFirestore(app);
    const feedbackRef = collection(firestore, 'crowdfund_feedback');
    const feedbackQuery = query(
      feedbackRef,
      orderBy('createdAtMs', 'desc'),
      limitQuery(normalizedLimit)
    );

    return onSnapshot(
      feedbackQuery,
      (snapshot) => {
        const entries = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() || {};
            const comment = sanitizeFeedbackText(data.comment || data.message);
            if (!comment) {
              return null;
            }
            return {
              id: docSnap.id || `feedback-${data.createdAtMs || Date.now()}`,
              comment,
              rating: sanitizeFeedbackRating(data.rating),
              createdAt: normalizeTimestamp(data.createdAt) ?? null,
            };
          })
          .filter(Boolean);
        if (onUpdate) {
          onUpdate(entries);
        }
      },
      (error) => {
        devConsole.warn?.('[firebase] pizza feedback listener error', error);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    devConsole.warn?.('[firebase] pizza feedback listener failed', error);
    if (onError) onError(error);
    return null;
  }
};
