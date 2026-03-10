const crypto = require('crypto');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function toSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function timingSafeEqualString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function textFromPortableBlocks(blocks = []) {
  if (!Array.isArray(blocks)) return '';
  return blocks
    .map((node) => {
      if (node?._type !== 'block') return '';
      const children = Array.isArray(node.children) ? node.children : [];
      return children.map((child) => String(child?.text || '')).join('').trim();
    })
    .filter(Boolean)
    .join('\n\n');
}

function portableBlocksToHtml(blocks = []) {
  if (!Array.isArray(blocks)) return '';
  return blocks
    .map((node) => {
      if (node?._type === 'image') {
        const src = node?.asset?.url || '';
        if (!src) return '';
        const alt = escapeHtml(node?.alt || '');
        return `<figure><img src="${escapeHtml(src)}" alt="${alt}" loading="lazy" /></figure>`;
      }
      if (node?._type !== 'block') return '';
      const children = Array.isArray(node.children) ? node.children : [];
      const text = children.map((child) => escapeHtml(child?.text || '')).join('');
      if (!text.trim()) return '';
      const style = String(node?.style || 'normal').toLowerCase();
      if (style === 'h1' || style === 'h2' || style === 'h3') {
        return `<${style}>${text}</${style}>`;
      }
      if (style === 'blockquote') {
        return `<blockquote>${text}</blockquote>`;
      }
      return `<p>${text}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

function buildExcerpt(post) {
  const explicit = String(post?.excerpt || '').trim();
  if (explicit) return explicit.slice(0, 220);
  return textFromPortableBlocks(post?.body || []).slice(0, 220);
}

function normalizeVisibility(raw) {
  const value = String(raw || 'public').trim().toLowerCase();
  if (value === 'members' || value === 'paid') return value;
  return 'public';
}

function coerceTierSlugs(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => toSlug(entry)).filter(Boolean);
}

function computeAccess(post, memberContext) {
  const visibility = normalizeVisibility(post?.visibility);
  if (visibility === 'public') return { allowed: true, visibility };
  const isSubscribed = !!memberContext?.isSubscribed;
  if (visibility === 'members') {
    return { allowed: isSubscribed, visibility };
  }
  const requiredTierSlugs = coerceTierSlugs(post?.requiredTierSlugs);
  const activeTierSlugs = new Set(coerceTierSlugs(memberContext?.activeTierSlugs || []));
  if (!isSubscribed) return { allowed: false, visibility };
  if (!requiredTierSlugs.length) {
    return { allowed: activeTierSlugs.size > 0, visibility };
  }
  const hasTier = requiredTierSlugs.some((slug) => activeTierSlugs.has(slug));
  return { allowed: hasTier, visibility };
}

function deriveAuthors(rawAuthors = []) {
  if (!Array.isArray(rawAuthors)) return [];
  return rawAuthors
    .map((author) => {
      const name = String(author?.name || '').trim();
      if (!name) return null;
      return {
        id: author?._id || null,
        name,
        slug: toSlug(author?.slug || name),
      };
    })
    .filter(Boolean);
}

function createPublishingService({ getSanityClient, getSanityReadClient, memberTokenSecret, siteUrl }) {
  const resolvedSite = String(siteUrl || 'https://localeffortfood.com').replace(/\/$/, '');
  const tokenSecret = String(memberTokenSecret || '').trim();

  function signMemberToken(email) {
    if (!tokenSecret) return '';
    return crypto.createHmac('sha256', tokenSecret).update(normalizeEmail(email)).digest('hex');
  }

  async function loadMemberContext(req) {
    const emailCandidate = normalizeEmail(
      req.get('x-member-email')
      || req.query?.memberEmail
      || req.query?.member_email
      || req.body?.memberEmail
      || req.body?.member_email
    );
    const tokenCandidate = String(
      req.get('x-member-token')
      || req.query?.memberToken
      || req.query?.member_token
      || req.body?.memberToken
      || req.body?.member_token
      || ''
    ).trim();

    if (!emailCandidate || !tokenCandidate || !tokenSecret) {
      return {
        isMemberAuthenticated: false,
        isSubscribed: false,
        activeTierSlugs: [],
        email: null,
      };
    }

    const expected = signMemberToken(emailCandidate);
    if (!expected || !timingSafeEqualString(expected, tokenCandidate)) {
      return {
        isMemberAuthenticated: false,
        isSubscribed: false,
        activeTierSlugs: [],
        email: null,
      };
    }

    const sc = (getSanityReadClient && getSanityReadClient()) || (getSanityClient && getSanityClient());
    if (!sc) {
      return {
        isMemberAuthenticated: false,
        isSubscribed: false,
        activeTierSlugs: [],
        email: null,
      };
    }

    const subscriber = await sc.fetch(
      '*[_type == "emailSubscriber" && email == $email][0]{ email, status, memberState, activeTierSlugs }',
      { email: emailCandidate }
    );
    const status = String(subscriber?.status || '').toLowerCase();
    const isSubscribed = status === 'subscribed' || String(subscriber?.memberState || '').toLowerCase() === 'active';
    return {
      isMemberAuthenticated: true,
      isSubscribed,
      activeTierSlugs: coerceTierSlugs(subscriber?.activeTierSlugs || []),
      email: subscriber?.email || emailCandidate,
    };
  }

  function canonicalForPost(post) {
    const slug = String(post?.slug || '').trim();
    return String(post?.canonicalUrl || (slug ? `${resolvedSite}/blog/${slug}` : `${resolvedSite}/blog`));
  }

  function serializePost(post, { includeBody = false, includeHtml = false } = {}) {
    const authors = deriveAuthors(post?.authors || []);
    const tags = Array.isArray(post?.tags) ? post.tags.map((entry) => String(entry || '').trim()).filter(Boolean) : [];
    const bodyText = textFromPortableBlocks(post?.body || []);
    const bodyHtml = portableBlocksToHtml(post?.body || []);
    const payload = {
      id: post?._id || null,
      title: post?.title || '',
      slug: post?.slug || '',
      excerpt: buildExcerpt(post),
      publishedAt: post?.publishedAt || null,
      updatedAt: post?._updatedAt || null,
      visibility: normalizeVisibility(post?.visibility),
      requiredTierSlugs: coerceTierSlugs(post?.requiredTierSlugs || []),
      authors,
      tags,
      canonicalUrl: canonicalForPost(post),
      metaTitle: post?.metaTitle || post?.title || '',
      metaDescription: post?.metaDescription || buildExcerpt(post),
      ogImageUrl: post?.ogImage?.asset?.url || post?.mainImage?.asset?.url || null,
      emailSegment: post?.emailSegment || 'all_subscribers',
      newsletter: post?.newsletter
        ? {
            id: post.newsletter._id || null,
            name: post.newsletter.name || '',
            slug: post.newsletter.slug || toSlug(post.newsletter.name || ''),
          }
        : null,
      readingTimeMinutes: Math.max(1, Math.ceil((bodyText || '').split(/\s+/).filter(Boolean).length / 220)),
    };
    if (includeBody) payload.body = post?.body || [];
    if (includeHtml) payload.html = bodyHtml;
    if (includeHtml && !payload.excerpt && bodyText) payload.excerpt = bodyText.slice(0, 220);
    return payload;
  }

  async function fetchRawPosts({ limit = 50 } = {}) {
    const sc = (getSanityReadClient && getSanityReadClient()) || (getSanityClient && getSanityClient());
    if (!sc) throw new Error('sanity-not-configured');
    const cappedLimit = Math.max(1, Math.min(200, Number(limit) || 50));
    const query = '*[_type == "blogPost" && defined(slug.current)] | order(coalesce(publishedAt, _createdAt) desc)[0...$limit]{ _id, _updatedAt, title, "slug": slug.current, excerpt, publishedAt, body, mainImage{asset->{url}, alt}, visibility, requiredTierSlugs, canonicalUrl, metaTitle, metaDescription, ogImage{asset->{url}, alt}, emailSegment, tags, newsletter->{_id, name, "slug": slug.current}, authors[]->{_id, name, "slug": slug.current} }';
    return sc.fetch(query, { limit: cappedLimit });
  }

  async function fetchRawPostBySlug(slug) {
    const normalized = String(slug || '').trim();
    if (!normalized) return null;
    const sc = (getSanityReadClient && getSanityReadClient()) || (getSanityClient && getSanityClient());
    if (!sc) throw new Error('sanity-not-configured');
    const query = '*[_type == "blogPost" && slug.current == $slug][0]{ _id, _updatedAt, title, "slug": slug.current, excerpt, publishedAt, body, mainImage{asset->{url}, alt}, visibility, requiredTierSlugs, canonicalUrl, metaTitle, metaDescription, ogImage{asset->{url}, alt}, emailSegment, tags, newsletter->{_id, name, "slug": slug.current}, authors[]->{_id, name, "slug": slug.current} }';
    return sc.fetch(query, { slug: normalized });
  }

  function filterByAccess(posts, memberContext) {
    return posts.filter((post) => computeAccess(post, memberContext).allowed);
  }

  function filterByAuthor(posts, authorSlug) {
    if (!authorSlug) return posts;
    const normalized = toSlug(authorSlug);
    return posts.filter((post) => deriveAuthors(post.authors).some((author) => toSlug(author.slug) === normalized));
  }

  function filterByTag(posts, tag) {
    if (!tag) return posts;
    const normalized = toSlug(tag);
    return posts.filter((post) => {
      const tags = Array.isArray(post.tags) ? post.tags : [];
      return tags.some((entry) => toSlug(entry) === normalized);
    });
  }

  function serializeFeedItem(post) {
    const serialized = serializePost(post, { includeHtml: true });
    return {
      ...serialized,
      html: portableBlocksToHtml(post?.body || []),
    };
  }

  return {
    signMemberToken,
    loadMemberContext,
    fetchRawPosts,
    fetchRawPostBySlug,
    filterByAccess,
    filterByAuthor,
    filterByTag,
    serializePost,
    serializeFeedItem,
    canonicalForPost,
    computeAccess,
    toSlug,
    escapeHtml,
    portableBlocksToHtml,
  };
}

module.exports = {
  createPublishingService,
  textFromPortableBlocks,
  portableBlocksToHtml,
};
