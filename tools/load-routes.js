// Helper: transpile src/config/routes.js (ESM) to CJS so Node scripts can require() it.
const fs = require('fs');
const path = require('path');

let _cached = null;

function loadRoutes() {
  if (_cached) return _cached;

  let esbuild;
  try {
    esbuild = require('esbuild');
  } catch (e) {
    console.error('esbuild is required. Ensure it is installed.');
    throw e;
  }

  const entry = path.join(__dirname, '..', 'src', 'config', 'routes.js');
  const outdir = path.join(__dirname, '.routes-build');
  const outfile = path.join(outdir, 'routes.cjs');
  fs.mkdirSync(outdir, { recursive: true });

  esbuild.buildSync({
    entryPoints: [entry],
    outfile,
    bundle: false,
    platform: 'node',
    format: 'cjs',
    sourcemap: false,
    logLevel: 'silent',
  });

  _cached = require(outfile);
  return _cached;
}

module.exports = { loadRoutes };
