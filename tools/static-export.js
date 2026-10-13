#!/usr/bin/env node
// Static export selected public routes to pre-rendered HTML for crawlers/LLMs.
// Usage: node tools/static-export.js

const fs = require('fs');
const path = require('path');
const React = require('react');
const { renderToString } = require('react-dom/server');
const { StaticRouter } = require('react-router-dom/server');
const { createPublishingService } = require('../backend/api/services/publishing');
const dotenv = require('dotenv');

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '.env.production.local'), override: false });
dotenv.config({ path: path.join(process.cwd(), '.env.vercel.production'), override: false });

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

  const publicEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.startsWith('VITE_') || key.startsWith('NEXT_PUBLIC_'))
  );

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
      'import.meta.env': JSON.stringify({
        ...publicEnv,
        BASE_URL: '/',
        MODE: 'production',
        DEV: false,
        PROD: true,
        SSR: true,
      }),
    },
    loader: {
      '.svg': 'dataurl',
      '.png': 'dataurl',
      '.jpg': 'dataurl',
      '.jpeg': 'dataurl',
      '.gif': 'dataurl',
    },
    external: [
      // Assets served straight out of public/ at runtime. Vite leaves
      // root-absolute url() alone, but esbuild tries to resolve it off disk and
      // fails the whole prerender — see src/styles/specimen.css, which is the
      // first CSS in this repo to reference a public asset that way.
      '/brand/*',
      '/images/*',
      '/gallery/*',
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
  // Sitemaps and canonicals share the production host; deployment environment
  // overrides must not reintroduce the apex-host redirect into every URL.
  const siteOrigin = 'https://www.localeffortfood.com';
  const abs = (url) => `${siteOrigin}${url}`;
  const publicRoutes = PUBLIC_ROUTES.filter((route) => route.sitemap !== false);
  const sitemapUrls = new Set(publicRoutes.map((route) => abs(route.path)));
  const pages = routes.map((url) => ({ url, pageData: null }));

  const projectId = process.env.VITE_APP_SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID;
  const dataset = process.env.VITE_APP_SANITY_DATASET || process.env.VITE_SANITY_DATASET || process.env.SANITY_DATASET;
  if (projectId && dataset) {
    const { createClient } = require('@sanity/client');
    // Public, published perspective only. Never use a privileged read token in
    // the exporter: these facts will be embedded in public HTML.
    const client = createClient({ projectId, dataset, useCdn: false, apiVersion: '2025-02-19', perspective: 'published' });
    const publishing = createPublishingService({ getSanityReadClient: () => client, siteUrl: siteOrigin });
    const posts = publishing.filterByAccess(await publishing.fetchRawPosts({ limit: 200 }), null);
    for (const rawPost of posts) {
      const post = publishing.serializePost(rawPost, { includeBody: true, includeHtml: true });
      const url = `/blog/${encodeURIComponent(post.slug)}`;
      pages.push({ url, pageData: { kind: 'blog', slug: post.slug, data: post } });
      if (post.canonicalUrl === abs(url)) sitemapUrls.add(abs(url));
    }
    const products = await client.fetch(`*[_type == "product" && defined(slug.current) && active == true]{
      _id, title, "slug": slug.current, shortDescription, longDescription,
      images[]{asset->{url}}, price, salePrice
    }`);
    for (const product of products) {
      const url = `/product/${encodeURIComponent(product.slug)}`;
      pages.push({ url, pageData: { kind: 'product', slug: product.slug, data: product } });
      sitemapUrls.add(abs(url));
    }
    process.stdout.write(`Prerender: loaded ${posts.length} public posts and ${products.length} active products\n`);
  } else {
    process.stdout.write('Prerender: Sanity not configured; no dynamic URLs advertised\n');
  }

  for (const { url, pageData } of pages) {
    const helmetContext = {};
    const app = React.createElement(
      StaticRouter,
      { location: url },
      React.createElement(StaticApp, { helmetContext, pageData })
    );
    const bodyHtml = renderToString(app);
    const helmet = helmetContext.helmet;
    const head = helmet
      ? [helmet.title?.toString?.(), helmet.meta?.toString?.(), helmet.link?.toString?.(), helmet.script?.toString?.()]
          .filter(Boolean)
          .join('\n')
      : '';
    const routeMeta = PUBLIC_ROUTES.find((route) => route.path === url);
    const jsonLdTag = routeMeta?.jsonLd
      ? `<script type="application/ld+json">${JSON.stringify(routeMeta.jsonLd).replace(/</g, '\\u003c')}</script>`
      : '';
    const snapshot = pageData
      ? `<script id="public-page-data" type="application/json">${JSON.stringify(pageData).replace(/</g, '\\u003c')}</script>`
      : '';
    const full = inject(template, bodyHtml, [head, jsonLdTag, snapshot].filter(Boolean).join('\n'));
    const outPath = path.join(process.cwd(), 'prerender', url === '/' ? '' : url, 'index.html');
    ensureDir(path.dirname(outPath));
    fs.writeFileSync(outPath, full, 'utf8');
    process.stdout.write(`Wrote ${outPath}\n`);
  }

  const escapeXml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...Array.from(sitemapUrls, (loc) => `  <url><loc>${escapeXml(loc)}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
  for (const directory of ['dist', 'public']) {
    ensureDir(path.join(process.cwd(), directory));
    fs.writeFileSync(path.join(process.cwd(), directory, 'sitemap.xml'), sitemap, 'utf8');
  }
  ensureDir(path.join(process.cwd(), 'prerender'));
  const dynamicPaths = pages.filter((page) => page.pageData && /^\/(blog|product)\//.test(page.url)).map((page) => page.url);
  fs.writeFileSync(path.join(process.cwd(), 'prerender', 'routes.json'), JSON.stringify(dynamicPaths, null, 2), 'utf8');
  process.stdout.write('Updated sitemap.xml and prerender route manifest\n');
})().catch((error) => {
  // A CMS outage must fail the build, not publish a sitemap full of empty shells.
  console.error('Static export failed:', error);
  process.exitCode = 1;
});


