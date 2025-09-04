#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const src = path.join(process.cwd(), 'prerender');
const dest = path.join(process.cwd(), 'dist', 'prerender');

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return false;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(destDir, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
  return true;
}

if (!fs.existsSync(src)) {
  console.warn('No prerender directory found, skipping copy.');
  process.exit(0);
}

if (!fs.existsSync(path.join(process.cwd(), 'dist'))) {
  console.warn('No dist directory found, skipping copy.');
  process.exit(0);
}

copyDir(src, dest);
console.log('Copied prerender to', dest);
