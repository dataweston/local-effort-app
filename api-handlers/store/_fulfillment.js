// Shared fulfillment config for the store checkout + pricing endpoints.
// Single source of truth so /api/store/price and /api/store/checkout never
// disagree on the local-delivery fee or pickup windows.

// Main-store local delivery fee, in cents.
const LOCAL_DELIVERY_FEE_CENTS = 600;
const CHEZ_GARAGE_DELIVERY_FEE_CENTS = 1000;
const CHEZ_GARAGE_DELIVERY_MINIMUM_CENTS = 7500;

// Valid pickup time windows for the /sale store (Wednesdays).
const PICKUP_TIME_WINDOWS = ['2pm-4pm', '4pm-6pm'];
const DEFAULT_PICKUP_TIME_WINDOW = PICKUP_TIME_WINDOWS[0];

// Stores that use the unified pickup/delivery model (Wednesday windows + $6
// local delivery). Other stores keep their own dated pickup notices.
const UNIFIED_FULFILLMENT_STORES = new Set(['sale']);

// Pickup details shown on the page and in confirmation emails.
const pickupByStore = {
  'tiny-diner': {
    name: 'Tiny Diner',
    date: 'October 31, 2025',
    time: '4-7pm',
    address: '1024 E 38th St, Minneapolis',
  },
  'happy-monday': {
    name: 'Happy Monday Coffee',
    date: 'October 23, 2025',
    time: '4-7pm',
    address: '2420 Cleveland Ave N, Roseville',
  },
  sale: {
    name: 'Neon Kitchens',
    date: 'Wednesday',
    // `time` is resolved per-order from the customer's chosen window.
    time: PICKUP_TIME_WINDOWS.join(' or '),
    address: '2103 W Broadway, Minneapolis',
  },
  'chez-garage': {
    name: 'Chez Garage',
    date: 'Thursday July 30 - Sunday August 2',
    time: 'See your confirmation email',
    address: '4379 Mackey Ave, Minneapolis MN 55424',
  },
};

const storeUsesUnifiedFulfillment = (store) => UNIFIED_FULFILLMENT_STORES.has(store);

// Normalize an incoming pickup time window to a known-good value, or null.
const normalizePickupWindow = (value) => {
  const trimmed = String(value || '').trim();
  return PICKUP_TIME_WINDOWS.includes(trimmed) ? trimmed : null;
};

// The fee added to an order for the chosen fulfillment method, in cents.
// Local delivery costs a flat fee; pickup is always free.
const resolveFulfillmentFee = (store, pickup) => {
  if (pickup) return 0;
  if (store === 'chez-garage') return CHEZ_GARAGE_DELIVERY_FEE_CENTS;
  if (!storeUsesUnifiedFulfillment(store)) return 0;
  return LOCAL_DELIVERY_FEE_CENTS;
};

const resolveDeliveryMinimum = (store) =>
  store === 'chez-garage' ? CHEZ_GARAGE_DELIVERY_MINIMUM_CENTS : 0;

module.exports = {
  CHEZ_GARAGE_DELIVERY_FEE_CENTS,
  CHEZ_GARAGE_DELIVERY_MINIMUM_CENTS,
  LOCAL_DELIVERY_FEE_CENTS,
  PICKUP_TIME_WINDOWS,
  DEFAULT_PICKUP_TIME_WINDOW,
  pickupByStore,
  storeUsesUnifiedFulfillment,
  normalizePickupWindow,
  resolveDeliveryMinimum,
  resolveFulfillmentFee,
};
