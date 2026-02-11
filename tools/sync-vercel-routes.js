#!/usr/bin/env node
// Sync prerender route mappings in vercel.json from src/config/routes.js.
// Usage: node tools/sync-vercel-routes.js

const fs = require('fs');
const path = require('path');
const { loadRoutes } = require('./load-routes');

const vercelPath = path.join(__dirname, '..', 'vercel.json');
const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
const { PUBLIC_ROUTES } = loadRoutes();

const prerenderPaths = PUBLIC_ROUTES.filter(r => r.prerender).map(r => r.path);

// Build prerender route entries
const prerenderRoutes = prerenderPaths.map((p) => {
  if (p === '/') {
    return { src: '^/$', dest: '/prerender/index.html' };
  }
  // Strip leading slash for the prerender folder path
  const clean = p.replace(/^\//, '');
  return { src: `^${p}$`, dest: `/prerender/${clean}/index.html` };
});

// Identify existing prerender routes (pattern: ^/...$ → /prerender/...)
const isPrerenderRoute = (r) =>
  typeof r.dest === 'string' && r.dest.startsWith('/prerender/') && !r.status;

// Find insertion point: right after the /api/(.*) rule
const apiIdx = vercel.routes.findIndex(
  (r) => r.src === '/api/(.*)' && r.dest === '/backend/api/server.js'
);
const insertAfter = apiIdx >= 0 ? apiIdx + 1 : vercel.routes.length - 1;

// Remove old prerender routes
const filtered = vercel.routes.filter((r) => !isPrerenderRoute(r));

// Re-find insertion point after filtering
const newApiIdx = filtered.findIndex(
  (r) => r.src === '/api/(.*)' && r.dest === '/backend/api/server.js'
);
const newInsert = newApiIdx >= 0 ? newApiIdx + 1 : filtered.length - 1;

// Insert prerender routes
filtered.splice(newInsert, 0, ...prerenderRoutes);
vercel.routes = filtered;

fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + '\n', 'utf8');
process.stdout.write(`Synced ${prerenderRoutes.length} prerender routes in vercel.json\n`);
