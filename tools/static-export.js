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
];

function inject(html, body, title, description) {
  let out = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  if (title) out = out.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
  if (description) out = out.replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${description}"/>`);
  return out;
}

function guessMeta(url) {
  const map = {
    '/': ['Local Effort | Personal Chef & Event Catering', 'Local Effort offers personal chef services, event catering, and meal prep in Roseville, MN.'],
    '/about': ['About Local Effort', 'Learn about our philosophy, sourcing, and team.'],
    '/services': ['Services | Local Effort', 'Private dinners, events, and custom menus.'],
    '/pricing': ['Pricing | Local Effort', 'Transparent pricing for services and events.'],
    '/menu': ['Menus | Local Effort', 'Seasonal menus and popular dishes.'],
    '/happy-monday': ['Happy Monday | Local Effort', 'Weekly lunch program details and feedback.'],
    '/gallery': ['Gallery | Local Effort', 'A selection of events and dishes.'],
    '/meal-prep': ['Meal Prep | Local Effort', 'Meal prep options and ordering info.'],
  '/partner-portal': ['Partner Portal | Local Effort', 'Tools and resources for partners.'],
  };
  return map[url] || map['/'];
}

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

(async () => {
  for (const url of routes) {
    const app = React.createElement(StaticRouter, { location: url }, React.createElement(StaticApp));
    const html = renderToString(app);
    const [title, description] = guessMeta(url);
    const full = inject(template, html, title, description);
    const outDir = path.join(process.cwd(), 'prerender', url === '/' ? '' : url);
    const outPath = path.join(outDir, 'index.html');
    ensureDir(outDir);
    fs.writeFileSync(outPath, full, 'utf8');
    console.log('Wrote', outPath);
  }
})();
