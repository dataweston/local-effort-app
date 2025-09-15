import React, { useMemo, useState } from 'react';
import { PortableText } from '@portabletext/react';
import { cn } from '../../lib/utils';
import { useCart } from '../cart/CartContext';

export default function ProductCard({ product }) {
  const { add, map } = useCart();
  const [hover, setHover] = useState(false);
  const [variantIdx, setVariantIdx] = useState(0);
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const chosen = hasVariants ? product.variants[Math.max(0, Math.min(variantIdx, product.variants.length-1))] : null;
  const price = chosen?.price ?? (product.salePrice ?? product.price);
  const primary = product.images && product.images[0];
  const rest = (product.images || []).slice(1);

  const handleAdd = () => {
    const variationId = chosen?.squareVariationId || product.squareVariationId || null;
    const key = `${product.id}:${variationId||''}`;
    const inCart = map?.[key]?.qty || 0;
    if (product.inventoryManaged) {
      const left = (typeof product.inventory === 'number' ? product.inventory : Infinity) - inCart;
      if (left <= 0) return; // out of stock
    }
    add({ productId: product.id, variationId, unitPrice: price, qty: 1, title: product.title, image: primary });
  };

  const formatted = useMemo(() => `$${(price / 100).toFixed(2)}`, [price]);

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden',
        'transition hover:shadow-md'
      )}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="aspect-[4/3] w-full bg-neutral-100 overflow-hidden">
        {primary ? (
          <img src={primary} alt={product.title} className="w-full h-full object-cover" />
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
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={product.inventoryManaged && (product.inventory ?? 0) <= (map?.[`${product.id}:${(chosen?.squareVariationId || product.squareVariationId || '')}`]?.qty || 0)}
            aria-disabled={product.inventoryManaged && (product.inventory ?? 0) <= (map?.[`${product.id}:${(chosen?.squareVariationId || product.squareVariationId || '')}`]?.qty || 0)}
            title={product.inventoryManaged && (product.inventory ?? 0) <= (map?.[`${product.id}:${(chosen?.squareVariationId || product.squareVariationId || '')}`]?.qty || 0) ? 'Out of stock' : 'Add to cart'}
          >
            {product.inventoryManaged && (product.inventory ?? 0) <= (map?.[`${product.id}:${(chosen?.squareVariationId || product.squareVariationId || '')}`]?.qty || 0) ? 'Out of stock' : 'Add to cart'}
          </button>
          {/* Placeholder for variants selector if provided */}
        </div>
      </div>

      {/* Quick view hover overlay */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-white/95 p-4 transition-opacity duration-200',
          hover ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="flex flex-col h-full">
          <h4 className="text-lg font-semibold mb-2 pr-8">{product.title}</h4>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[primary, ...rest].filter(Boolean).slice(0,3).map((src, i) => (
              <img key={i} src={src} alt="" className="h-24 w-full object-cover rounded" />
            ))}
          </div>
          {product.longDescription ? (
            <div className="prose prose-sm max-w-none text-neutral-700 overflow-auto" dangerouslySetInnerHTML={{ __html: product.longDescription }} />
          ) : Array.isArray(product.longDescriptionBlocks) && product.longDescriptionBlocks.length ? (
            <div className="prose prose-sm max-w-none text-neutral-700 overflow-auto">
              <PortableText value={product.longDescriptionBlocks} />
            </div>
          ) : null}
          <div className="mt-auto flex justify-end gap-2">
            <button className="btn" onClick={handleAdd}>Add to cart</button>
            <button className="btn btn-primary" onClick={handleAdd}>Buy now</button>
          </div>
        </div>
      </div>
    </div>
  );
}
