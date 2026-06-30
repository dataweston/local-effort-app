/**
 * productCode
 *
 * Stable per-product display code (e.g. "LE-7F3"). Derived from the product's
 * immutable Sanity id so the code never shifts when the catalog is filtered,
 * reordered, or has items added/removed — unlike a positional index.
 *
 * The grid tile and the detail overlay both call this, so a product always
 * shows the same code in both places.
 */

// Deterministic 32-bit FNV-1a hash of a string.
const hashString = (input) => {
  let hash = 0x811c9dc5;
  const str = String(input || '');
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    // 32-bit FNV prime multiply, kept in 32-bit range.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

// Build a fixed-width base36 suffix (uppercase) of `width` characters.
const toCode = (id, width = 3) => {
  const base = hashString(id).toString(36).toUpperCase();
  if (base.length >= width) return base.slice(0, width);
  return base.padStart(width, '0');
};

export const productCode = (product, prefix = 'LE') => {
  const id = product?.id || product?._id || product?.slug || product?.title || '';
  return `${prefix}-${toCode(id)}`;
};

export default productCode;
