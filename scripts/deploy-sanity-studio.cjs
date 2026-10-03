#!/usr/bin/env node
const path = require('path');
const {spawnSync} = require('child_process');
const dotenv = require('dotenv');

dotenv.config();
dotenv.config({path: path.resolve(process.cwd(), '.env.production.local'), override: false});

const authToken = process.env.SANITY_AUTH_TOKEN || process.env.SANITY_WRITE_TOKEN;
if (!authToken) {
  process.stderr.write('SANITY_WRITE_TOKEN or SANITY_AUTH_TOKEN is required to deploy the Studio.\n');
  process.exit(1);
}

const studioDirectory = path.resolve(process.cwd(), 'studio');
const cli = path.resolve(studioDirectory, 'node_modules/sanity/bin/sanity');
const result = spawnSync(
  process.execPath,
  [cli, 'deploy', '--yes', ...process.argv.slice(2)],
  {
    cwd: studioDirectory,
    env: {...process.env, SANITY_AUTH_TOKEN: authToken},
    stdio: 'inherit',
  },
);

if (result.error) {
  process.stderr.write(`${result.error.message}\n`);
  process.exit(1);
}
process.exit(result.status ?? 1);
