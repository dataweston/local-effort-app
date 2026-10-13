#!/usr/bin/env node
// Sync prerender route mappings in vercel.json from src/config/routes.js.
// Usage: node tools/sync-vercel-routes.js

const fs = require('fs');
const path = require('path');
const { loadRoutes } = require('./load-routes');

const vercelPath = path.join(__dirname, '..', 'vercel.json');
const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
const { PUBLIC_ROUTES } = loadRoutes();
const siteOrigin = 'https://www.localeffortfood.com';
const dynamicManifestPath = path.join(__dirname, '..', 'prerender', 'routes.json');
const dynamicPaths = fs.existsSync(dynamicManifestPath)
  ? JSON.parse(fs.readFileSync(dynamicManifestPath, 'utf8'))
  : [];
if (!Array.isArray(dynamicPaths) || dynamicPaths.some(p =>
  typeof p !== 'string' ||
  !/^\/(?:blog|product)\/[^/?#\\\s]+$/.test(p) ||
  new URL(p, siteOrigin).pathname !== p
)) {
  throw new Error('prerender/routes.json must contain an array of encoded /blog/ or /product/ paths');
}
const publicPaths = [...new Set([...PUBLIC_ROUTES.map(r => r.path), ...dynamicPaths])];
const prerenderPaths = [...new Set([
  ...PUBLIC_ROUTES.filter(r => r.prerender).map(r => r.path),
  ...dynamicPaths,
])];
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Build prerender route entries
const prerenderRoutes = prerenderPaths.map((p) => {
  if (p === '/') {
    return { src: '^/$', dest: '/prerender/index.html' };
  }
  // Strip leading slash for the prerender folder path
  const clean = p.replace(/^\//, '');
  return { src: `^${escapeRegex(p)}$`, dest: `/prerender/${clean}/index.html` };
});

// Slash variants must redirect to the final canonical path, not the SPA shell.
const slashRedirects = publicPaths.filter(p => p !== '/').map(p => ({
  src: `^${escapeRegex(p)}/+$`,
  dest: `${siteOrigin}${p}`,
  status: 308,
}));

// Identify existing prerender routes (pattern: ^/...$ → /prerender/...)
const isPrerenderRoute = (r) =>
  typeof r.dest === 'string' && r.dest.startsWith('/prerender/') && !r.status;

// Replace generated mappings while preserving intentional retired redirects.
const isCanonicalSlashRedirect = r =>
  r.status === 308 &&
  typeof r.dest === 'string' &&
  r.dest.startsWith(`${siteOrigin}/`) &&
  r.src === `^${escapeRegex(r.dest.slice(siteOrigin.length))}/+$`;
const filtered = vercel.routes
  .filter(r => !isPrerenderRoute(r) && !isCanonicalSlashRedirect(r))
  .map(r => {
    if (!r.status || typeof r.dest !== 'string' || !r.dest.startsWith('/')) return r;
    // An exact legacy alias with a slash should reach its destination in one hop.
    const src = /^\^\/[\w/-]+\$$/.test(r.src)
      ? `${r.src.slice(0, -1)}/?$`
      : r.src;
    return { ...r, src, dest: `${siteOrigin}${r.dest}` };
  });

// Re-find insertion point after filtering
const newApiIdx = filtered.findIndex(
  (r) => r.src === '/api/(.*)' && r.dest === '/backend/api/server.js'
);
const newInsert = newApiIdx >= 0 ? newApiIdx + 1 : filtered.length - 1;

// Normalize slash paths before serving the prerendered documents.
filtered.splice(newInsert, 0, ...slashRedirects, ...prerenderRoutes);
vercel.routes = filtered;

fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + '\n', 'utf8');
process.stdout.write(`Synced ${prerenderRoutes.length} prerender routes and ${slashRedirects.length} canonical slash redirects in vercel.json\n`);
