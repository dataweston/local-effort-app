const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('@playwright/test');

const root = __dirname;
const host = '127.0.0.1';
const preferredPort = 8080;
const deckUrlPath = '/walker-deck.html';
const slideDir = path.join(root, 'slide-images');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
};

function serveFile(req, res) {
  const url = new URL(req.url, `http://${host}`);
  const decodedPath = decodeURIComponent(url.pathname === '/' ? deckUrlPath : url.pathname);
  const filePath = path.resolve(root, `.${decodedPath}`);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, body) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end(err.code || 'Error');
      return;
    }

    res.writeHead(200, {
      'Content-Type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  });
}

function listen(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(serveFile);
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve({ server, port });
    });
  });
}

async function waitForAssets(page) {
  await page.evaluate(async () => {
    if (document.fonts) await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve, reject) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', () => reject(new Error(`Image failed: ${img.currentSrc || img.src}`)), { once: true });
        });
      }),
    );
  });
}

async function main() {
  let server;
  let port = preferredPort;

  try {
    ({ server, port } = await listen(preferredPort));
  } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
    ({ server, port } = await listen(0));
  }

  const baseUrl = `http://${host}:${port}`;
  console.log(`Serving ${root} at ${baseUrl}`);

  let browser;
  try {
    browser = await chromium.launch({ args: ['--disable-background-networking'] });
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 2,
    });

    await page.goto(`${baseUrl}${deckUrlPath}`, { waitUntil: 'networkidle' });
    await waitForAssets(page);
    await page.addStyleTag({
      content: `
        body { background: white !important; }
        .deck { padding: 0 !important; gap: 0 !important; }
        .slide { box-shadow: none !important; }
        .nav-controls { display: none !important; }
      `,
    });

    await page.pdf({
      path: path.join(root, 'walker-deck.print.pdf'),
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    fs.mkdirSync(slideDir, { recursive: true });
    const slides = page.locator('.slide');
    const slideCount = await slides.count();
    const slidePaths = [];

    for (let i = 0; i < slideCount; i += 1) {
      const filename = `slide-${String(i + 1).padStart(2, '0')}.png`;
      const slidePath = path.join(slideDir, filename);
      await slides.nth(i).screenshot({ path: slidePath, type: 'png' });
      slidePaths.push(`slide-images/${filename}`);
      console.log(`Rendered ${filename}`);
    }

    const flatHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Walker deck flattened</title>
<style>
  @page { size: 1280px 720px; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .page { width: 1280px; height: 720px; page-break-after: always; break-after: page; overflow: hidden; }
  .page:last-child { page-break-after: auto; break-after: auto; }
  img { display: block; width: 1280px; height: 720px; object-fit: cover; }
</style>
</head>
<body>
${slidePaths.map((src) => `<section class="page"><img src="${src}" alt=""></section>`).join('\n')}
</body>
</html>
`;
    fs.writeFileSync(path.join(root, 'walker-deck.flat.html'), flatHtml);

    const flatPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await flatPage.goto(`${baseUrl}/walker-deck.flat.html`, { waitUntil: 'networkidle' });
    await waitForAssets(flatPage);
    await flatPage.pdf({
      path: path.join(root, 'walker-deck.flattened.pdf'),
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    console.log(`Wrote ${path.join(root, 'walker-deck.print.pdf')}`);
    console.log(`Wrote ${path.join(root, 'walker-deck.flattened.pdf')}`);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
