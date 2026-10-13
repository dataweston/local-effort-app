// Bound Sanity originals without changing existing crop/hotspot parameters.
// Non-Sanity images retain their provider's URL and transformation semantics.
export function sanityImageUrl(source, width) {
  if (!source) return '';
  try {
    const url = new URL(source);
    if (url.hostname !== 'cdn.sanity.io') return source;
    url.searchParams.set('w', String(width));
    url.searchParams.set('fit', 'max');
    url.searchParams.set('auto', 'format');
    url.searchParams.set('q', '80');
    return url.toString();
  } catch {
    return source;
  }
}
