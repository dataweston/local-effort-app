import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';

const CartContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'init':
      return action.payload || state;
    case 'add': {
      const { productId, variationId, unitPrice, title, image } = action.payload;
      const key = `${productId}:${variationId||''}`;
      const qty = Math.max(1, action.payload.qty || 1);
      const next = { ...state, items: { ...(state.items || {}) } };
      const existing = next.items[key];
      next.items[key] = existing
        ? { ...existing, qty: existing.qty + qty }
        : { key, productId, variationId, unitPrice, qty, title, image };
      next.updatedAt = Date.now();
      return next;
    }
    case 'remove': {
      const next = { ...state, items: { ...(state.items || {}) } };
      delete next.items[action.key];
      next.updatedAt = Date.now();
      return next;
    }
    case 'updateQty': {
      const next = { ...state, items: { ...(state.items || {}) } };
      const li = next.items[action.key];
      if (!li) return state;
      li.qty = Math.max(0, action.qty);
      if (li.qty === 0) delete next.items[action.key];
      next.updatedAt = Date.now();
      return next;
    }
    case 'clear':
      return { items: {}, updatedAt: Date.now() };
    default:
      return state;
  }
}

const initial = { items: {}, updatedAt: 0 };

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [open, setOpen] = useState(false);

  // load from storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('le_cart');
      if (raw) dispatch({ type: 'init', payload: JSON.parse(raw) });
    } catch (e) {
      // ignore storage error
    }
  }, []);

  // persist
  useEffect(() => {
    try { localStorage.setItem('le_cart', JSON.stringify(state)); } catch (e) {
      // ignore storage error
    }
  }, [state]);

  const add = useCallback((payload) => dispatch({ type: 'add', payload }), []);
  const remove = useCallback((key) => dispatch({ type: 'remove', key }), []);
  const updateQty = useCallback((key, qty) => dispatch({ type: 'updateQty', key, qty }), []);
  const clear = useCallback(() => dispatch({ type: 'clear' }), []);
  const openCart = useCallback(() => setOpen(true), []);
  const closeCart = useCallback(() => setOpen(false), []);

  const itemsArr = useMemo(() => Object.values(state.items || {}), [state.items]);
  const totalQty = useMemo(() => itemsArr.reduce((s, i) => s + (i.qty || 0), 0), [itemsArr]);
  const subtotal = useMemo(() => itemsArr.reduce((s, i) => s + i.unitPrice * i.qty, 0), [itemsArr]);

  const value = useMemo(() => ({
    items: itemsArr,
    map: state.items,
    totalQty,
    add, remove, updateQty, clear,
    subtotal,
    open, openCart, closeCart,
  }), [itemsArr, state.items, totalQty, add, remove, updateQty, clear, subtotal, open, openCart, closeCart]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

