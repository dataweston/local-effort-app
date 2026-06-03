import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';

const CartContext = createContext(null);

const normalizeAddOnIndices = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .map((idx) => Number(idx))
      .filter((idx) => Number.isInteger(idx) && idx >= 0)
  )].sort((a, b) => a - b);
};

export const buildCartKey = (productId, variationId = null, addOnIndices = [], dairyFree = false) => {
  const addOns = normalizeAddOnIndices(addOnIndices);
  const optionKey = [
    addOns.length ? `addons=${addOns.join('.')}` : '',
    dairyFree ? 'df=1' : '',
  ].filter(Boolean).join('&');
  return `${productId}:${variationId || ''}${optionKey ? `:${optionKey}` : ''}`;
};

const normalizeStoredState = (rawState) => {
  if (!rawState || typeof rawState !== 'object') return initial;
  const rawItems = rawState.items && typeof rawState.items === 'object' ? rawState.items : {};
  const items = {};

  Object.values(rawItems).forEach((item) => {
    if (!item || typeof item !== 'object' || !item.productId) return;
    const qty = Math.max(1, Number(item.qty) || 1);
    const addOnIndices = normalizeAddOnIndices(item.addOnIndices);
    const dairyFree = !!item.dairyFree;
    const key = buildCartKey(item.productId, item.variationId || null, addOnIndices, dairyFree);
    const normalized = {
      ...item,
      key,
      variationId: item.variationId || null,
      addOnIndices,
      dairyFree,
      qty,
      unitPrice: Number(item.unitPrice) || 0,
    };

    if (items[key]) {
      items[key] = {
        ...items[key],
        qty: items[key].qty + qty,
      };
    } else {
      items[key] = normalized;
    }
  });

  return {
    items,
    updatedAt: Number(rawState.updatedAt) || Date.now(),
  };
};

function reducer(state, action) {
  switch (action.type) {
    case 'init':
      return normalizeStoredState(action.payload);
    case 'add': {
      const {
        productId,
        variationId,
        unitPrice,
        title,
        image,
        addOnIndices: rawAddOnIndices,
        dairyFree: rawDairyFree,
        optionSummary,
      } = action.payload;
      const addOnIndices = normalizeAddOnIndices(rawAddOnIndices);
      const dairyFree = !!rawDairyFree;
      const key = buildCartKey(productId, variationId || null, addOnIndices, dairyFree);
      const qty = Math.max(1, action.payload.qty || 1);
      const next = { ...state, items: { ...(state.items || {}) } };
      const existing = next.items[key];
      next.items[key] = existing
        ? { ...existing, qty: existing.qty + qty }
        : {
            key,
            productId,
            variationId: variationId || null,
            unitPrice: Number(unitPrice) || 0,
            qty,
            title,
            image,
            addOnIndices,
            dairyFree,
            optionSummary: optionSummary || '',
          };
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

