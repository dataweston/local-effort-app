#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const projector = require('../backend/api/brain/partnerEvidenceProjector');

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const instagramArg = args.find((arg) => arg.startsWith('--instagram='));
  const rootDir = path.resolve(__dirname, '..');
  const vendors = await projector.loadVendors();
  const repo = projector.scanRepository({ rootDir, vendors });
  let instagram = [];
  if (instagramArg) {
    const filename = path.resolve(instagramArg.slice('--instagram='.length));
    instagram = projector.scanInstagramExport(JSON.parse(fs.readFileSync(filename, 'utf8')), vendors);
  }
  const candidates = [...repo, ...instagram];
  const result = await projector.projectEvidence(candidates, { apply });
  console.log(JSON.stringify({ apply, vendors: vendors.length, repositoryCandidates: repo.length, instagramCandidates: instagram.length, ...result }, null, 2));
}

main().catch((error) => { console.error('[project-partner-evidence] failed:', error.message); process.exitCode = 1; });
