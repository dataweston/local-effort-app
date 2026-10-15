import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';

// The router imports prisma at load time, so the stub goes into require.cache
// before the router is required (see venues.test.js for why not vi.mock).
const require = createRequire(import.meta.url);
const TOKEN = 'routing-test-token';
const state = { nodes: [], routes: [] };

const db = {
  venueCalendarFeed: { findMany: async () => [] },
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
});
