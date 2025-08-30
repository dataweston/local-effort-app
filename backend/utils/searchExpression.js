/**
 * Helper to build Cloudinary search expressions from simple params.
 * Keep expressions simple and predictable so frontend can request by `collection`.
 */
function buildExpression({ collection, type, published = true, extra = [] } = {}) {
  const parts = [];

  // Helper to safely format a namespaced tag like `collection:home` by quoting
  // the value portion. This avoids Cloudinary search parser errors when tags
  // include colons or other punctuation.
  const formatNamespacedTag = (ns, val) => {
    if (val === undefined || val === null) return null;
    const safeVal = String(val).replace(/"/g, '\\"');
    return `tags:"${ns}:${safeVal}"`;
  };

  if (type) {
    const t = formatNamespacedTag('type', type);
    if (t) parts.push(t);
  }
  if (collection) {
    const c = formatNamespacedTag('collection', collection);
    if (c) parts.push(c);
  }
  if (published) parts.push('tags:published');

  // extra can contain raw tag expressions like 'tags:dish:margherita' or other filters
  for (const e of extra || []) {
    if (typeof e === 'string' && e.trim()) {
      const trimmed = e.trim();
      // If extra already looks like a namespaced tag (starts with tags: and contains a colon), quote the rhs
      if (/^tags:[^\s]+:[^\s]+/.test(trimmed)) {
        const [, , rest] = trimmed.split(/tags:([^:]+):(.+)/);
        // The above split yields undefined in some engines; fallback to simple replace
        const m = trimmed.match(/^tags:([^:]+):(.+)$/);
        if (m) {
          const ns = m[1];
          const val = m[2];
          parts.push(`tags:"${ns}:${String(val).replace(/\"/g, '\\\"')}"`);
          continue;
        }
      }
      parts.push(trimmed);
    }
  }

  // Default to searching images if nothing explicit provided
  if (parts.length === 0) return 'resource_type:image';
  return parts.join(' AND ');
}

module.exports = { buildExpression };
