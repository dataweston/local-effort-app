import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPublicContextRouter } from '../publicContext';

function createApp(overrides = {}) {
  const logger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  };
  const router = createPublicContextRouter({
    logger,
    ...overrides,
  });
  const app = express();
  app.use('/api', router);
  return { app, logger };
}

const tempDirs = [];

function writeJsonFixture(name, value) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'le-public-context-'));
  tempDirs.push(dir);
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
  return filePath;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('public context router', () => {
  it('serves machine-readable site payload from manifest data', async () => {
    const manifestPath = writeJsonFixture('manifest.json', {
      name: 'Local Effort Food Co.',
      site: 'https://example.test',
      updated: '2026-03-29T00:00:00.000Z',
      navigation: [{ path: '/', title: 'Home' }],
      apis: [{ method: 'GET', path: '/api/support/search' }],
      feeds: [{ type: 'sitemap', url: 'https://example.test/sitemap.xml' }],
      support: { email: 'team@example.test' },
      mcpServers: [{ name: 'mcp' }],
      ucpServers: [{ name: 'ucp' }],
    });
    const { app } = createApp({ manifestPath });

    const res = await request(app).get('/api/public/site');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      name: 'Local Effort Food Co.',
      url: 'https://example.test',
      navigation: [{ path: '/', title: 'Home' }],
      endpoints: [{ method: 'GET', path: '/api/support/search' }],
      feeds: [{ type: 'sitemap', url: 'https://example.test/sitemap.xml' }],
      support: { email: 'team@example.test' },
      mcp: [{ name: 'mcp' }],
      ucp: [{ name: 'ucp' }],
      sitemap: 'https://example.test/sitemap.xml',
      aiTxt: 'https://example.test/ai.txt',
      manifest: 'https://example.test/ai/manifest.json',
      updatedAt: '2026-03-29T00:00:00.000Z',
    });
  });

  it('falls back cleanly when the manifest is missing', async () => {
    const { app } = createApp({
      manifestPath: path.join(os.tmpdir(), 'does-not-exist.json'),
      env: { PUBLIC_SITE_URL: 'https://fallback.test' },
      now: () => '2026-03-29T12:00:00.000Z',
    });

    const res = await request(app).get('/api/public/site');

    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://fallback.test');
    expect(res.body.updatedAt).toBe('2026-03-29T12:00:00.000Z');
    expect(res.body.endpoints.some((entry) => entry.path === '/api/public/pricing-faq')).toBe(true);
  });

  it('serves faq and estimator payloads with updated timestamps', async () => {
    const pricingFaqPath = writeJsonFixture('pricingFaq.json', [
      { name: 'How much does it cost?', answer: 'It depends.' },
    ]);
    const estimatorHelpPath = writeJsonFixture('estimatorHelp.json', [
      { title: 'How it works', body: 'Ballpark only.' },
    ]);
    const { app } = createApp({ pricingFaqPath, estimatorHelpPath });

    const faqRes = await request(app).get('/api/public/pricing-faq');
    const estimatorRes = await request(app).get('/api/public/estimator-help');

    expect(faqRes.status).toBe(200);
    expect(faqRes.body.items).toEqual([{ name: 'How much does it cost?', answer: 'It depends.' }]);
    expect(typeof faqRes.body.updatedAt).toBe('string');

    expect(estimatorRes.status).toBe(200);
    expect(estimatorRes.body.items).toEqual([{ title: 'How it works', body: 'Ballpark only.' }]);
    expect(typeof estimatorRes.body.updatedAt).toBe('string');
  });
});
