/**
 * Happy Monday menu catalog, server side.
 *
 * Mirrors `src/partners/happymonday/menuItems.js`, which is the list the portal
 * actually prices and displays orders with. Kept as CommonJS because backend
 * handlers cannot import the ESM module.
 *
 * KNOWN DRIFT: `send-invoice-email.js` carries a third, older copy of this list
 * whose ids 9-13 and 17 disagree with the portal (its id 9 is '12" Pepperoni',
 * the portal's is '4" Pepperoni'). Invoice emails are customer-facing, so that
 * copy is deliberately left alone here rather than silently repriced — it needs
 * an owner decision. The Finance Core projection uses only this file, and any
 * gap between these prices and a portal invoice total is written as an explicit
 * reconciliation line instead of being absorbed.
 */
const HAPPY_MONDAY_MENU_ITEMS = [
  { id: 1, name: 'Egg Salad Sandwich', price: 5.85, category: 'Sandwiches' },
  { id: 2, name: 'Turkey Breast', price: 7.1, category: 'Sandwiches' },
  { id: 21, name: 'Chicken Salad Sandwich', price: 7.1, category: 'Sandwiches' },
  { id: 3, name: 'Roast Beef', price: 7.1, category: 'Sandwiches' },
  { id: 4, name: 'Pastrami', price: 7.1, category: 'Sandwiches' },
  { id: 5, name: 'Mortadella', price: 7.1, category: 'Sandwiches' },
  { id: 6, name: 'Vegetable', price: 6.1, category: 'Sandwiches' },
  { id: 7, name: '12" Cheese', price: 7.1, category: 'Pizza' },
  { id: 8, name: '4" Cheese', price: 3.6, category: 'Pizza' },
  { id: 9, name: '4" Pepperoni', price: 3.6, category: 'Pizza' },
  { id: 10, name: '12" Pepperoni', price: 8.1, category: 'Pizza' },
  { id: 11, name: '12" Seasonal', price: 8.1, category: 'Pizza' },
  { id: 12, name: '12" Supreme', price: 8.1, category: 'Pizza' },
  { id: 13, name: '12" Gluten Free', price: 8.1, category: 'Pizza' },
  { id: 14, name: 'Beet Salad', price: 5.1, category: 'Salads' },
  { id: 15, name: 'Pasta Salad (gluten free)', price: 3.1, category: 'Salads' },
  { id: 16, name: 'Yogurt & Granola (gluten free)', price: 3.1, category: 'Breakfast' },
  { id: 17, name: 'Yogurt & Granola with chocolate (gluten free)', price: 3.85, category: 'Breakfast' },
  { id: 18, name: 'Chia Pudding', price: 3.1, category: 'Breakfast' },
  { id: 19, name: 'Chia Pudding (dairy free)', price: 4.1, category: 'Breakfast' },
  { id: 20, name: 'salame cotto', price: 7.1, category: 'Sandwiches' },
];

const HAPPY_MONDAY_ITEMS_BY_ID = new Map(HAPPY_MONDAY_MENU_ITEMS.map((item) => [item.id, item]));

module.exports = { HAPPY_MONDAY_ITEMS_BY_ID, HAPPY_MONDAY_MENU_ITEMS };
