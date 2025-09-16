import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PortableText } from '@portabletext/react';
import { cn } from '../../lib/utils';
import { useCart } from '../cart/CartContext';
import { useToast } from '../../components/common/ToastProvider';

export default function ProductCard({ product }) {
  const { add, map, updateQty, open, openCart } = useCart();
  const { notify } = useToast();
  const [variantIdx, setVariantIdx] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);
  const prevFocusRef = useRef(null);
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const chosen = hasVariants ? product.variants[Math.max(0, Math.min(variantIdx, product.variants.length-1))] : null;
  const price = chosen?.price ?? (product.salePrice ?? product.price);

  const images = useMemo(() => {
    const arr = Array.isArray(product?.images) ? product.images : [];
    return arr
      .map((i) => (typeof i === 'string' ? i : (i?.url || i?.asset?.url || null)))
      .filter(Boolean);
  }, [product]);
  const primary = images[0];
  const rest = images.slice(1);
  const variantSelectId = useMemo(() => `variant-select-${product.id || 'p'}`, [product.id]);

  const handleAdd = () => {
    const variationId = chosen?.squareVariationId || product.squareVariationId || null;
    const key = `${product.id}:${variationId||''}`;
    const inCart = map?.[key]?.qty || 0;
    if (product.inventoryManaged) {
      const left = (typeof product.inventory === 'number' ? product.inventory : Infinity) - inCart;
      if (left <= 0) return; // out of stock
    }
    add({ productId: product.id, variationId, unitPrice: price, qty: 1, title: product.title, image: primary });
    notify('Added to cart', { actionLabel: open ? undefined : 'View cart', onAction: open ? undefined : openCart });
  };

  const key = `${product.id}:${(chosen?.squareVariationId || product.squareVariationId || '')}`;
  const inCartQty = map?.[key]?.qty || 0;

  const formatted = useMemo(() => `$${(price / 100).toFixed(2)}`, [price]);

  // Focus trap + Escape close for modal
  useEffect(() => {
    if (!showDetails) return;
    prevFocusRef.current = document.activeElement;
    const dlg = dialogRef.current;
    // Focus close button first
    if (closeBtnRef.current) {
      try { closeBtnRef.current.focus(); } catch (e) { /* noop */ }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setShowDetails(false);
        return;
      }
      if (e.key === 'Tab' && dlg) {
        const focusable = dlg.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(focusable).filter((el) => el.offsetParent !== null);
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      // restore focus
      const prev = prevFocusRef.current;
      if (prev && prev.focus) {
        try { prev.focus(); } catch (e) { /* noop */ }
      }
    };
  }, [showDetails]);

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden',
        'transition hover:shadow-md'
      )}
    >
      <div
        className="relative aspect-[4/3] w-full bg-neutral-100 overflow-hidden cursor-pointer"
        role="button"
        tabIndex={0}
        onClick={() => setShowDetails(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowDetails(true); } }}
      >
        {primary ? (
          <>
            <img
              src={primary}
              alt={product.title}
              loading="lazy"
              className={cn(
                'absolute inset-0 h-full w-full object-cover',
                rest[0] ? 'transition-opacity duration-300 opacity-100 group-hover:opacity-0' : ''
              )}
            />
            {rest[0] ? (
              <img
                src={rest[0]}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 opacity-0 group-hover:opacity-100"
              />
            ) : null}
            {/* Hover info bar over image only */}
            <div
              className={cn(
                'pointer-events-none absolute inset-x-0 bottom-0 transition-opacity duration-200',
                'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
              )}
            >
              <div className="pointer-events-none bg-gradient-to-t from-black/70 to-transparent text-white p-3">
                {product.shortDescription ? (
                  <p className="text-xs leading-snug line-clamp-2">{product.shortDescription}</p>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full grid place-items-center text-neutral-400">No image</div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-base font-semibold leading-tight line-clamp-2">
            <button
              type="button"
              className="text-left w-full cursor-pointer hover:underline focus:outline-none"
              onClick={() => setShowDetails(true)}
            >
              {product.title}
            </button>
          </h3>
          <div className="text-sm font-mono">
            {product.salePrice && (
              <span className="text-neutral-400 line-through mr-1">${(product.price/100).toFixed(2)}</span>
            )}
            <span className="text-rose-600 font-bold">{formatted}</span>
          </div>
        </div>
        {product.shortDescription && (
          <p className="text-sm text-neutral-600 mt-1 line-clamp-2">{product.shortDescription}</p>
        )}
        <div className="mt-3 flex gap-2 items-center">
          {hasVariants && (
            <select
              className="input"
              value={variantIdx}
              onChange={(e) => setVariantIdx(Number(e.target.value) || 0)}
              aria-label="Choose a variant"
            >
              {product.variants.map((v, i) => (
                <option key={v.squareVariationId || v.name || i} value={i}>{v.name || `Option ${i+1}`}</option>
              ))}
            </select>
          )}
          {inCartQty > 0 && (
            <div className="inline-flex items-center gap-2">
              <button className="btn" onClick={() => updateQty(key, Math.max(0, inCartQty - 1))} aria-label="Decrease quantity">-</button>
              <span className="min-w-[2ch] text-center text-sm">{inCartQty}</span>
              <button className="btn" onClick={() => updateQty(key, inCartQty + 1)} aria-label="Increase quantity">+</button>
            </div>
          )}
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={product.inventoryManaged && (product.inventory ?? 0) <= inCartQty}
            aria-disabled={product.inventoryManaged && (product.inventory ?? 0) <= inCartQty}
            title={product.inventoryManaged && (product.inventory ?? 0) <= inCartQty ? 'Out of stock' : 'Add to cart'}
          >
            {product.inventoryManaged && (product.inventory ?? 0) <= inCartQty ? 'Out of stock' : (inCartQty > 0 ? 'Add one more' : 'Add to cart')}
          </button>
          {/* Placeholder for variants selector if provided */}
        </div>
      </div>

      {showDetails && (
        <div className="fixed inset-0 z-[60]" aria-hidden={!showDetails}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDetails(false)} />
          <div
            className="absolute inset-x-3 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 top-10 bottom-10 md:top-1/2 md:-translate-y-1/2 md:bottom-auto w-auto md:w-[720px] max-w-[95vw]"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`product-dialog-title-${product.id}`}
            ref={dialogRef}
          >
            <div className="bg-white rounded-xl shadow-2xl border overflow-hidden flex flex-col h-full md:h-auto">
              <div className="flex items-start justify-between p-4 border-b">
                <h3 id={`product-dialog-title-${product.id}`} className="text-lg font-semibold">{product.title}</h3>
                <button ref={closeBtnRef} className="btn" onClick={() => setShowDetails(false)} aria-label="Close">✕</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-4 p-4 overflow-auto">
                <div>
                  {primary ? (
                    <img src={primary} alt={product.title} className="w-full h-56 md:h-72 object-cover rounded" />
                  ) : (
                    <div className="w-full h-56 md:h-72 grid place-items-center text-neutral-400 bg-neutral-100 rounded">No image</div>
                  )}
                  {rest.length > 0 && (
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {[primary, ...rest].slice(0,8).map((u, i) => (
                        <div key={i} className="block">
                          <img src={u} alt="" className="w-full h-16 object-cover rounded" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xl font-semibold">{formatted}</div>
                  {hasVariants && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium mb-1" htmlFor={variantSelectId}>Choose an option</label>
                      <select
                        className="input w-full"
                        id={variantSelectId}
                        value={variantIdx}
                        onChange={(e) => setVariantIdx(Number(e.target.value) || 0)}
                      >
                        {product.variants.map((v, i) => (
                          <option key={v.squareVariationId || v.name || i} value={i}>{v.name || `Option ${i+1}`}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {Array.isArray(product.longDescriptionBlocks) && product.longDescriptionBlocks.length > 0 ? (
                    <div className="prose prose-sm mt-4 max-w-none">
                      <PortableText value={product.longDescriptionBlocks} />
                    </div>
                  ) : product.longDescription ? (
                    <p className="text-sm text-neutral-700 mt-4 whitespace-pre-wrap">{product.longDescription}</p>
                  ) : null}
                  <div className="mt-6 flex gap-2 items-center">
                    {inCartQty > 0 && (
                      <div className="inline-flex items-center gap-2">
                        <button className="btn" onClick={() => updateQty(key, Math.max(0, inCartQty - 1))} aria-label="Decrease quantity">-</button>
                        <span className="min-w-[2ch] text-center text-sm">{inCartQty}</span>
                        <button className="btn" onClick={() => updateQty(key, inCartQty + 1)} aria-label="Increase quantity">+</button>
                      </div>
                    )}
                    <button
                      className="btn btn-primary"
                      onClick={handleAdd}
                      disabled={product.inventoryManaged && (product.inventory ?? 0) <= inCartQty}
                      aria-disabled={product.inventoryManaged && (product.inventory ?? 0) <= inCartQty}
                    >
                      {product.inventoryManaged && (product.inventory ?? 0) <= inCartQty ? 'Out of stock' : (inCartQty > 0 ? 'Add one more' : 'Add to cart')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
