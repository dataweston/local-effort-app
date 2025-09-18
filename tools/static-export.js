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

const routes = [
  '/',
  '/about',
  '/services',
  '/pricing',
  '/menu',
  '/happy-monday',
  '/gallery',
  '/meal-prep',
  '/partner-portal',
  '/crowdfunding',
];

function inject(html, body, head) {
  let out = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  if (head && typeof head === 'string' && head.trim()) {
    out = out.replace('</head>', `${head}\n</head>`);
  }
  return out;
}

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

(async () => {
  const abs = (u) => `https://localeffortfood.com${u}`;
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
    const full = inject(template, bodyHtml, head);
    const outDir = path.join(process.cwd(), 'prerender', url === '/' ? '' : url);
    const outPath = path.join(outDir, 'index.html');
    ensureDir(outDir);
    fs.writeFileSync(outPath, full, 'utf8');
    seenUrls.push(abs(url));
    process.stdout.write(`Wrote ${outPath}\n`);
  }

  // Generate a basic sitemap from prerendered routes
      const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...seenUrls.map((loc) => `  <url><loc>${loc}</loc></url>`),
        '</urlset>',
        ''
      ].join('\n');
  // Write to dist and public to keep hosting consistent
  const distPath = path.join(process.cwd(), 'dist', 'sitemap.xml');
  const pubPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  try { fs.mkdirSync(path.dirname(distPath), { recursive: true }); } catch (e) { /* noop */ }
  fs.writeFileSync(distPath, sitemap, 'utf8');
  fs.writeFileSync(pubPath, sitemap, 'utf8');
  process.stdout.write('Updated sitemap.xml\n');
})();
