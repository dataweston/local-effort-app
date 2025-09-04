#!/usr/bin/env node
// Parse Thumbtack review widget HTML (pasted export) into JSON testimonial objects.
// Usage:
//   node tools/parse-thumbtack-widget.js path/to/widget.html > public/reviews/thumbtack.json
//   type widget.html | node tools/parse-thumbtack-widget.js > public/reviews/thumbtack.json

const fs = require('fs');

function readAllStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function stripTags(html) {
  return html
    .replace(/<br\s*\/?>(\r?\n)?/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseWidgets(html) {
  const results = [];
  // Split by each tt-right block which contains name, stars, spans, and the <p> review
  const blocks = html.split(/<div\s+class=["']tt-right["'][^>]*>/i).slice(1);
  for (const block of blocks) {
    // Take everything up to the next tt-right block or end of string
    const nextIdx = block.search(/<div\s+class=["']tt-right["'][^>]*>/i);
    const segment = nextIdx === -1 ? block : block.slice(0, nextIdx);
    const nameMatch = segment.match(/<div\s+class=["']tt-name["'][^>]*>([\s\S]*?)<\/div>/i);
    const pMatch = segment.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const starsCount = (segment.match(/orange_star\.svg/gi) || []).length;
    const spans = Array.from(segment.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)).map((m) => stripTags(m[1] || ''));
    const author = nameMatch ? stripTags(nameMatch[1]) : 'Thumbtack User';
    const quote = pMatch ? stripTags(pMatch[1]) : '';
    if (!quote) continue;
    const contextParts = ['Thumbtack'];
    if (spans[0]) contextParts.push(spans[0]); // e.g., "13 reviews"
    if (spans[1]) contextParts.push(spans[1]); // e.g., relative date
    if (starsCount) contextParts.push(`${starsCount}★`);
    results.push({ quote, author, context: contextParts.join(' · ') });
  }
  return results;
}

(async () => {
  try {
    const file = process.argv[2];
    const outFile = process.argv[3] || '';
    let html = '';
    if (file) {
      html = fs.readFileSync(file, 'utf8');
    } else {
      html = await readAllStdin();
    }
    const items = parseWidgets(html);
    const json = JSON.stringify(items, null, 2);
    if (outFile) {
      fs.mkdirSync(require('path').dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, json);
    } else {
      process.stdout.write(json);
    }
  } catch (err) {
    console.error('Failed to parse widget:', err.message);
    process.exit(1);
  }
})();
