/**
 * Helper to build Cloudinary search expressions from simple params.
 * Keep expressions simple and predictable so frontend can request by `collection`.
 */
function buildExpression({ collection, type, published = true, extra = [] } = {}) {
  const parts = [];

  if (type) parts.push(`tags:type:${type}`);
  if (collection) parts.push(`tags:collection:${collection}`);
  if (published) parts.push('tags:published');

  // extra can contain raw tag expressions like 'tags:dish:margherita' or other filters
  for (const e of extra || []) {
    if (typeof e === 'string' && e.trim()) parts.push(e.trim());
  }

  // Default to searching images if nothing explicit provided
  if (parts.length === 0) return 'resource_type:image';
  return parts.join(' AND ');
}

module.exports = { buildExpression };
