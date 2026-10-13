// Shared fulfillment config for the store checkout + pricing endpoints.
// Single source of truth so /api/store/price and /api/store/checkout never
// disagree on the local-delivery fee or pickup windows.

// Pizza on Smith runs a seasonal three-way fulfillment offer.
const PIZZA_DELIVERY_FEE_CENTS = 1200;
const PIZZA_SHIPPING_FEE_CENTS = 2200;
const PIZZA_SHIPPING_MINIMUM_CENTS = 10000;

const LOCAL_DELIVERY_FEE_CENTS = 600;
const CHEZ_GARAGE_DELIVERY_FEE_CENTS = 1000;
const CHEZ_GARAGE_DELIVERY_MINIMUM_CENTS = 7500;
const PICKUP_TIME_WINDOWS = ['2pm-4pm', '4pm-6pm'];
const DEFAULT_PICKUP_TIME_WINDOW = PICKUP_TIME_WINDOWS[0];

// Stores that use the unified Wednesday pickup windows + flat local-delivery fee.
const UNIFIED_FULFILLMENT_STORES = new Set(['sale']);

// Pickup details shown on the page and in confirmation emails.
const pickupByStore = {
  'pizza-on-smith': require('./_pizzaOnSmith').catalog.pickup,
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

const normalizePickupWindow = (value) => {
  const trimmed = String(value || '').trim();
  return PICKUP_TIME_WINDOWS.includes(trimmed) ? trimmed : null;
};

const resolveFulfillmentFee = (store, pickup, method = pickup ? 'pickup' : 'delivery') => {
  if (pickup || method === 'pickup') return 0;
  if (store === 'pizza-on-smith') return method === 'shipping' ? PIZZA_SHIPPING_FEE_CENTS : PIZZA_DELIVERY_FEE_CENTS;
  if (store === 'chez-garage') return CHEZ_GARAGE_DELIVERY_FEE_CENTS;
  return storeUsesUnifiedFulfillment(store) ? LOCAL_DELIVERY_FEE_CENTS : 0;
};

const resolveDeliveryMinimum = (store, method = 'delivery') =>
  store === 'chez-garage' ? CHEZ_GARAGE_DELIVERY_MINIMUM_CENTS
    : store === 'pizza-on-smith' && method === 'shipping' ? PIZZA_SHIPPING_MINIMUM_CENTS
      : 0;

module.exports = {
  CHEZ_GARAGE_DELIVERY_FEE_CENTS,
  CHEZ_GARAGE_DELIVERY_MINIMUM_CENTS,
  LOCAL_DELIVERY_FEE_CENTS,
  PIZZA_DELIVERY_FEE_CENTS,
  PIZZA_SHIPPING_FEE_CENTS,
  PIZZA_SHIPPING_MINIMUM_CENTS,
  PICKUP_TIME_WINDOWS,
  DEFAULT_PICKUP_TIME_WINDOW,
  pickupByStore,
  storeUsesUnifiedFulfillment,
  normalizePickupWindow,
  resolveDeliveryMinimum,
  resolveFulfillmentFee,
};
