#!/usr/bin/env node
// Static export selected public routes to pre-rendered HTML for crawlers/LLMs.
// Usage: node tools/static-export.js

const fs = require('fs');
const path = require('path');
const React = require('react');
const { renderToString } = require('react-dom/server');
const { StaticRouter } = require('react-router-dom/server');

// Build the SSR entry (JSX) to CJS on the fly so Node can require it
function buildSSRApp() {
  let esbuild;
  try {
    esbuild = require('esbuild');
  } catch (e) {
    console.error('esbuild is required to prerender routes. Please ensure it is installed.');
    throw e;
  }

  const entry = path.join(__dirname, '..', 'src', 'ssr', 'StaticApp.jsx');
  const outdir = path.join(__dirname, '.ssr-build');
  const outfile = path.join(outdir, 'StaticApp.cjs');
  fs.mkdirSync(outdir, { recursive: true });

  esbuild.buildSync({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    jsx: 'automatic',
    sourcemap: false,
    logLevel: 'silent',
    define: {
      'process.env.NODE_ENV': '"production"',
      'import.meta.env.SSR': 'true',
      // Ensure import.meta.env.DEV (and similar flags) exist during the SSR build
      'import.meta.env.DEV': 'false',
    },
    loader: {
      '.svg': 'dataurl',
      '.png': 'dataurl',
      '.jpg': 'dataurl',
      '.jpeg': 'dataurl',
      '.gif': 'dataurl',
    },
    external: [
      // Avoid bundling React/runtime to ensure singletons match react-dom/server
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/server',
      // Router and animation libs
      'react-router',
      'react-router-dom',
      'react-router-dom/server',
      'framer-motion',
      // Common UI libs that may be browser-y; load from node_modules at runtime if needed
      'lucide-react',
      '@cloudinary/react',
      '@cloudinary/url-gen',
      '@portabletext/react',
      '@sanity/block-content-to-react',
      '@sanity/client',
      '@sanity/image-url',
      'firebase',
    ],
  });

  // eslint-disable-next-line global-require
  const mod = require(outfile);
  return mod.default || mod;
}

const StaticApp = buildSSRApp();

const distTemplatePath = path.join(process.cwd(), 'dist', 'index.html');
const srcTemplatePath = path.join(process.cwd(), 'index.html');
const templatePath = fs.existsSync(distTemplatePath) ? distTemplatePath : srcTemplatePath;
const template = fs.readFileSync(templatePath, 'utf8');

const { loadRoutes } = require('./load-routes');
const { PUBLIC_ROUTES } = loadRoutes();
const routes = PUBLIC_ROUTES.filter(r => r.prerender).map(r => r.path);

function inject(html, body, head) {
  let out = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  if (head && typeof head === 'string' && head.trim()) {
    // Drop the template's static title/description when the route provides its
    // own — two <title> tags leave Google free to pick the generic one.
    if (/<title[\s>]/.test(head)) {
      out = out.replace(/<title>[^<]*<\/title>\s*/i, '');
    }
    if (/name="description"/.test(head)) {
      out = out.replace(/<meta(?:[^>"]|"[^"]*")*name="description"(?:[^>"]|"[^"]*")*>\s*/i, '');
    }
    out = out.replace('</head>', `${head}\n</head>`);
  }
  return out;
}

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

(async () => {
  const siteOrigin = (
    process.env.SITE_ORIGIN ||
    process.env.PUBLIC_SITE_URL ||
    process.env.PUBLIC_URL ||
    'https://www.localeffortfood.com'
  ).replace(/\/$/, '');
  const abs = (u) => `${siteOrigin}${u}`;
  const seenUrls = [];
  for (const url of routes) {
    const helmetContext = {};
    const app = React.createElement(
      StaticRouter,
      { location: url },
      React.createElement(StaticApp, { helmetContext })
    );
    const bodyHtml = renderToString(app);
    // Prefer Helmet-rendered head (title, meta, JSON-LD) when available
    const helmet = helmetContext.helmet;
    const head = helmet
      ? [helmet.title?.toString?.(), helmet.meta?.toString?.(), helmet.link?.toString?.(), helmet.script?.toString?.()]
          .filter(Boolean)
          .join('\n')
      : '';
    // Lazy-loaded pages render as a Suspense fallback here, so their Helmet
    // JSON-LD never reaches the static HTML. Routes can declare a static
    // `jsonLd` object in routes.js to get structured data into the export.
    const routeMeta = PUBLIC_ROUTES.find((r) => r.path === url);
    const jsonLdTag = routeMeta && routeMeta.jsonLd
      ? `<script type="application/ld+json">${JSON.stringify(routeMeta.jsonLd)}</script>`
      : '';
    const full = inject(template, bodyHtml, [head, jsonLdTag].filter(Boolean).join('\n'));
    const outDir = path.join(process.cwd(), 'prerender', url === '/' ? '' : url);
    const outPath = path.join(outDir, 'index.html');
    ensureDir(outDir);
    fs.writeFileSync(outPath, full, 'utf8');
    seenUrls.push(abs(url));
    process.stdout.write(`Wrote ${outPath}\n`);
  }

  // Generate sitemap from all public routes (not just prerendered),
  // plus dynamic blog/product slugs fetched from Sanity when configured.
  const dynamicUrls = [];
  try {
    const dotenv = require('dotenv');
    dotenv.config();
    dotenv.config({ path: path.join(process.cwd(), '.env.production.local'), override: false });
    const projectId = process.env.VITE_APP_SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID;
    const dataset = process.env.VITE_APP_SANITY_DATASET || process.env.VITE_SANITY_DATASET || process.env.SANITY_DATASET;
    if (projectId && dataset) {
      const sanity = require('@sanity/client');
      const client = sanity.createClient({ projectId, dataset, useCdn: true, apiVersion: '2023-05-03' });
      const blogSlugs = await client
        .fetch('*[_type == "blogPost" && defined(slug.current)][].slug.current')
        .catch(() => []);
      const productSlugs = await client
        .fetch('*[_type == "product" && defined(slug.current) && active == true][].slug.current')
        .catch(() => []);
      for (const slug of blogSlugs || []) dynamicUrls.push(abs(`/blog/${encodeURIComponent(slug)}`));
      for (const slug of productSlugs || []) dynamicUrls.push(abs(`/product/${encodeURIComponent(slug)}`));
      process.stdout.write(`Sitemap: added ${dynamicUrls.length} dynamic blog/product URLs\n`);
    }
  } catch (err) {
    process.stdout.write(`Sitemap: skipped dynamic slugs (${err && err.message})\n`);
  }

  const allPublicUrls = PUBLIC_ROUTES.map(r => abs(r.path)).concat(dynamicUrls);
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...allPublicUrls.map((loc) => `  <url><loc>${loc}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
  // Write to dist and public to keep hosting consistent
  const distPath = path.join(process.cwd(), 'dist', 'sitemap.xml');
  const pubPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  try { fs.mkdirSync(path.dirname(distPath), { recursive: true }); } catch (e) { /* noop */ }
  fs.writeFileSync(distPath, sitemap, 'utf8');
  fs.writeFileSync(pubPath, sitemap, 'utf8');
  process.stdout.write('Updated sitemap.xml\n');

  // Write routes manifest for the API sitemap endpoint
  const manifest = { publicPaths: PUBLIC_ROUTES.map(r => r.path) };
  const manifestPath = path.join(process.cwd(), '.routes-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  process.stdout.write('Wrote .routes-manifest.json\n');
})();


