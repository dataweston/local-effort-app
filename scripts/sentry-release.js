#!/usr/bin/env node
/*
 * Cross-platform Sentry release helper.
 * Usage:
 *   node scripts/sentry-release.js build     # build + create + upload + commits + finalize
 *   node scripts/sentry-release.js new|files|commits|finalize|all
 *
 * Automatically derives SENTRY_RELEASE from git short SHA if unset for build/ all flows.
 */

/* eslint-disable no-console */
const { execSync } = require('child_process');

function run(cmd) {
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (err) {
    console.error('[sentry-release] Command failed:', cmd);
    process.exitCode = 1;
  }
}

function ensureRelease() {
  if (!process.env.SENTRY_RELEASE) {
    try {
      const sha = execSync('git rev-parse --short HEAD').toString().trim();
      process.env.SENTRY_RELEASE = sha;
      console.log('[sentry-release] Derived SENTRY_RELEASE =', sha);
    } catch (e) {
      console.warn('[sentry-release] Could not derive git SHA; set SENTRY_RELEASE explicitly.');
    }
  } else {
    console.log('[sentry-release] Using SENTRY_RELEASE =', process.env.SENTRY_RELEASE);
  }
}

const step = process.argv[2];
if (!step) {
  console.error('Usage: node scripts/sentry-release.js <new|files|commits|finalize|all|build|version>');
  process.exit(1);
}

if (step === 'version') {
  console.log('SENTRY_RELEASE =', process.env.SENTRY_RELEASE || '(unset)');
  process.exit(0);
}

const releaseSteps = {
  new: () => run(`pnpm exec sentry-cli releases new ${process.env.SENTRY_RELEASE}`),
  files: () =>
    run(
      `pnpm exec sentry-cli releases files ${process.env.SENTRY_RELEASE} upload-sourcemaps dist --rewrite --url-prefix '~/dist'`
    ),
  commits: () => run(`pnpm exec sentry-cli releases set-commits --auto ${process.env.SENTRY_RELEASE}`),
  finalize: () => run(`pnpm exec sentry-cli releases finalize ${process.env.SENTRY_RELEASE}`)
};

function doAll() {
  releaseSteps.new();
  releaseSteps.files();
  releaseSteps.commits();
  releaseSteps.finalize();
}

switch (step) {
  case 'build':
    ensureRelease();
    run('pnpm run build');
    doAll();
    break;
  case 'all':
    ensureRelease();
    doAll();
    break;
  case 'new':
  case 'files':
  case 'commits':
  case 'finalize':
    ensureRelease();
    releaseSteps[step]();
    break;
  default:
    console.error('Unknown step:', step);
    process.exit(1);
}
