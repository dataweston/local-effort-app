import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatePath = path.join(__dirname, 'template.html');
const template = fs.readFileSync(templatePath, 'utf8');

// Read tokens from stdin (so we can pipe)
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const tokens = JSON.parse(Buffer.concat(chunks).toString('utf8'));

// simple token replace: {{TOKEN}}
let html = template;
for (const [k,v] of Object.entries(tokens)) {
  const val = typeof v === 'string' ? v : JSON.stringify(v);
  const re = new RegExp(`{{\\s*${k}\\s*}}`, 'g');
  html = html.replace(re, val);
}

// Remove any unreplaced {{...}} to avoid showing braces in inboxes
html = html.replace(/{{\s*[^}]+\s*}}/g, '');

process.stdout.write(html);