// The exporter embeds only public CMS facts so the first browser render matches
// crawler-visible HTML. Never include member-only content or credentials here.
export function readPublicPageData(kind, slug) {
  if (typeof document === 'undefined') return null;
  const node = document.getElementById('public-page-data');
  if (!node) return null;
  try {
    const snapshot = JSON.parse(node.textContent);
    return snapshot.kind === kind && snapshot.slug === slug ? snapshot.data : null;
  } catch {
    return null;
  }
}
