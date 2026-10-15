import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';

// The router imports prisma at load time, so the stub goes into require.cache
// before the router is required (see venues.test.js for why not vi.mock).
const require = createRequire(import.meta.url);
const TOKEN = 'routing-test-token';
const state = { nodes: [], routes: [] };
const created = [];

const db = {
  venueCalendarFeed: {
    findMany: async () => [],
    create: async ({ data }) => {
      const row = { id: `f${created.length + 1}`, ...data };
      created.push(row);
      return row;
    },
  },
  calendarNode: {
    findMany: async () => state.nodes,
    deleteMany: async ({ where }) => {
      const keep = where?.id?.notIn || [];
      state.nodes = state.nodes.filter((node) => keep.includes(node.id));
    },
    upsert: async ({ where, create, update }) => {
      const at = state.nodes.findIndex((node) => node.id === where.id);
      if (at >= 0) Object.assign(state.nodes[at], update);
      else state.nodes.push({ ...create });
    },
  },
  calendarRoute: {
    findMany: async () => state.routes,
    deleteMany: async () => {
      state.routes = [];
    },
    createMany: async ({ data }) => {
      state.routes = data.map((row, i) => ({ id: `r${i}`, ...row }));
    },
  },
  calendarMirror: { count: async () => 0 },
  venueBlock: { findMany: async () => [] },
  smallEventAvailability: { findMany: async () => [] },
  smallEventHold: { findMany: async () => [] },
  $transaction: (fn) => fn(db),
};

let server;
let base;
const headers = { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` };
const call = (route, init = {}) => fetch(base + route, { headers, ...init });

beforeAll(async () => {
  process.env.SMALL_EVENTS_ADMIN_TOKEN = TOKEN;
  const prismaPath = require.resolve(path.resolve(__dirname, '../../utils/prisma'));
  require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: { prisma: db } };
  const express = require('express');
  const { createCalendarRouter } = require('../calendar');
  const app = express();
  app.use(express.json());
  app.use('/r', createCalendarRouter({ logger: { warn() {}, error() {}, info() {} } }));
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/r`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

describe('calendar routing admin API', () => {
  it('refuses requests without the admin token', async () => {
    const res = await fetch(`${base}/graph`);
    expect(res.status).toBe(401);
    const bad = await fetch(`${base}/graph`, { headers: { authorization: 'Bearer nope' } });
    expect(bad.status).toBe(401);
  });

  it('lets a signed-in admin in without the token, and nobody else', async () => {
    const express = require('express');
    const { createCalendarRouter } = require('../calendar');
    const app = express();
    app.use('/s', createCalendarRouter({
      logger: { warn() {}, error() {}, info() {} },
      verifyAdminRequest: async (req) => (req.headers.authorization === 'Bearer session-jwt' ? { email: 'owner@example.com' } : null),
    }));
    const s = await new Promise((resolve) => {
      const instance = app.listen(0, () => resolve(instance));
    });
    try {
      const url = `http://127.0.0.1:${s.address().port}/s/graph`;
      expect((await fetch(url, { headers: { authorization: 'Bearer session-jwt' } })).status).toBe(200);
      expect((await fetch(url, { headers: { authorization: 'Bearer other' } })).status).toBe(401);
    } finally {
      await new Promise((resolve) => s.close(resolve));
    }
  });

  it('serves the default graph before anything is saved', async () => {
    const body = await (await call('/graph')).json();
    const ids = body.graph.nodes.map((node) => node.id);
    expect(ids).toContain('resource:client');
    expect(ids).toContain('resource:firehouse');
    expect(ids).toContain('hub');
    // The rule the owner stated: a FIREHOUSE booking blocks Small Events.
    expect(body.graph.routes).toContainEqual(
      expect.objectContaining({ fromId: 'resource:firehouse', toId: 'resource:client', kind: 'blocks' })
    );
  });

  it('rejects a draft whose routes point at unknown nodes', async () => {
    const res = await call('/preview', {
      method: 'POST',
      body: JSON.stringify({
        resource: 'client',
        graph: { nodes: [], routes: [{ fromId: 'x', toId: 'y', kind: 'blocks' }] },
      }),
    });
    expect(res.status).toBe(400);
  });

  it('previews what a draft changes without saving it', async () => {
    const { graph } = await (await call('/graph')).json();
    const draft = {
      nodes: [...graph.nodes, { id: 'feed:abc', kind: 'feed', label: 'Airbnb', config: {} }],
      routes: [...graph.routes, { fromId: 'feed:abc', toId: 'resource:firehouse', kind: 'blocks', enabled: true }],
    };
    const res = await call('/preview', {
      method: 'POST',
      body: JSON.stringify({ resource: 'client', graph: draft, from: '2026-12-01', to: '2026-12-03' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.days).toHaveLength(3);
    expect(state.nodes).toHaveLength(0);
  });

  it('persists a saved graph and rejects a malformed Google calendar id', async () => {
    const { graph } = await (await call('/graph')).json();
    const ok = await call('/graph', {
      method: 'PUT',
      body: JSON.stringify({ nodes: graph.nodes, routes: graph.routes }),
    });
    expect(ok.status).toBe(200);
    expect(state.nodes.length).toBe(graph.nodes.length);
    expect(state.routes.length).toBe(graph.routes.length);

    const bad = await call('/graph', {
      method: 'PUT',
      body: JSON.stringify({
        nodes: [{ id: 'google:x', kind: 'google', label: 'x', config: { calendarId: 'a b' } }],
        routes: [],
      }),
    });
    expect(bad.status).toBe(400);
  });

  it('adds a Google calendar that closes Small Events dates, and reads it once', async () => {
    const express = require('express');
    const { createCalendarRouter } = require('../calendar');
    const synced = [];
    const app = express();
    app.use(express.json());
    app.use('/r', createCalendarRouter({
      logger: { warn() {}, error() {}, info() {} },
      syncFeed: async (feed) => {
        synced.push(feed.url);
        return { feedId: feed.id, status: 'ok', blocks: 2 };
      },
    }));
    const s = await new Promise((resolve) => { const x = app.listen(0, () => resolve(x)); });
    const url = `http://127.0.0.1:${s.address().port}/r/feeds`;
    try {
      const post = (body) => fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      expect((await post({ label: 'x', googleCalendarId: 'a b', resource: 'client' })).status).toBe(400);
      expect((await post({ label: '', googleCalendarId: 'abc@group.calendar.google.com', resource: 'client' })).status).toBe(400);
      expect((await post({ label: 'x', googleCalendarId: 'abc@group.calendar.google.com', resource: 'nope' })).status).toBe(400);
      expect(created).toHaveLength(0);

      const res = await post({ label: '608 Smith', googleCalendarId: 'abc@group.calendar.google.com', resource: 'firehouse' });
      expect(res.status).toBe(200);
      expect(created[0]).toMatchObject({ venue: 'firehouse', url: 'google-calendar:abc@group.calendar.google.com' });
      expect(synced).toEqual(['google-calendar:abc@group.calendar.google.com']);
      // A saved layout is authoritative, so the cable is saved with the feed.
      expect(state.routes.some((r) => r.fromId === `feed:${created[0].id}` && r.toId === 'resource:firehouse' && r.kind === 'blocks')).toBe(true);
    } finally {
      await new Promise((resolve) => s.close(resolve));
    }
  });
});
