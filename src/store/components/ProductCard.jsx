import React, { useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import { useCart } from '../cart/CartContext';
import { useToast } from '../../components/common/ToastProvider';

export default function ProductCard({ product }) {
  const { add, map, updateQty, open, openCart } = useCart();
  const { notify } = useToast();
  const [variantIdx, setVariantIdx] = useState(0);
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

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden',
        'transition hover:shadow-md'
      )}
    >
      <div className="relative aspect-[4/3] w-full bg-neutral-100 overflow-hidden">
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
          <h3 className="text-base font-semibold leading-tight line-clamp-2">{product.title}</h3>
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
          {inCartQty > 0 ? (
            <div className="inline-flex items-center gap-2">
              <button className="btn" onClick={() => updateQty(key, Math.max(0, inCartQty - 1))} aria-label="Decrease quantity">-</button>
              <span className="min-w-[2ch] text-center text-sm">{inCartQty}</span>
              <button className="btn" onClick={() => updateQty(key, inCartQty + 1)} aria-label="Increase quantity">+</button>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={product.inventoryManaged && (product.inventory ?? 0) <= inCartQty}
              aria-disabled={product.inventoryManaged && (product.inventory ?? 0) <= inCartQty}
              title={product.inventoryManaged && (product.inventory ?? 0) <= inCartQty ? 'Out of stock' : 'Add to cart'}
            >
              {product.inventoryManaged && (product.inventory ?? 0) <= inCartQty ? 'Out of stock' : 'Add to cart'}
            </button>
          )}
          {/* Placeholder for variants selector if provided */}
        </div>
      </div>

    </div>
  );
}
