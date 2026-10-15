// Admin API for the universal calendar's routing graph: what feeds in, what it
// blocks, what it mirrors out. Everything here is owner-only. The public side of
// the calendar (availability, booking, .ics) lives in routes/venues.js.

const express = require('express');
const { prisma } = require('../utils/prisma');
const { __internals: venueInternals } = require('./venues');
const { loadGraph, loadFacts, validateGraph, resourceSlugs, resourceLabel } = require('../calendar/graph');
const { resolveResourceDays, kindOf } = require('../calendar/engine');
const { todayChicago, addDaysIso, isIsoDate } = require('../calendar/dates');
const google = require('../calendar/google');

const MAX_PREVIEW_DAYS = 400;

function createCalendarRouter({ logger } = {}) {
  const router = express.Router();

  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Robots-Tag', 'noindex');
    if (!venueInternals.isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
    if (!prisma) return res.status(503).json({ error: 'database-unavailable' });
    return next();
  });

  // The effective graph plus the facts the editor shows beside it: which
  // resources exist, whether Google is configured, and bookings whose calendar
  // event has not landed.
  router.get('/graph', async (req, res) => {
    try {
      const graph = await loadGraph(prisma);
      const failedMirrors = await prisma.calendarMirror
        .count({ where: { status: 'error' } })
        .catch((error) => (error?.code === 'P2021' ? 0 : Promise.reject(error)));
      return res.json({
        graph,
        resources: resourceSlugs().map((slug) => ({ slug, label: resourceLabel(slug) })),
        google: {
          configured: google.isConfigured(),
          serviceAccountEmail: process.env.GOOGLE_CALENDAR_SA_EMAIL || null,
        },
        failedMirrors,
      });
    } catch (error) {
      if (logger?.error) logger.error({ err: error }, 'calendar graph load failed');
      return res.status(503).json({ error: 'graph-unavailable' });
    }
  });

  // Save the whole layout at once, in one transaction, so a half-saved graph can
  // never be what a buyer's claim is checked against.
  router.put('/graph', async (req, res) => {
    const nodes = req.body?.nodes;
    const routes = req.body?.routes;
    const problem = validateGraph({ nodes, routes });
    if (problem) return res.status(400).json({ error: problem });

    for (const node of nodes) {
      if (node.kind === 'google') {
        const id = node.config?.calendarId;
        if (id != null && !/^[A-Za-z0-9._%+@#-]{1,200}$/.test(String(id))) {
          return res.status(400).json({ error: 'invalid-calendar-id' });
        }
      }
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.calendarRoute.deleteMany({});
        await tx.calendarNode.deleteMany({ where: { id: { notIn: nodes.map((node) => node.id) } } });
        for (const node of nodes) {
          // A feed's sync status is live data owned by the feed row; only its
          // position is the editor's to save.
          const config = kindOf(node.id) === 'feed' ? {} : node.config && typeof node.config === 'object' ? node.config : {};
          const data = {
            kind: node.kind,
            label: String(node.label || node.id).slice(0, 80),
            config,
            posX: Number.isFinite(node.posX) ? Math.round(node.posX) : null,
            posY: Number.isFinite(node.posY) ? Math.round(node.posY) : null,
          };
          await tx.calendarNode.upsert({ where: { id: node.id }, create: { id: node.id, ...data }, update: data });
        }
        if (routes.length) {
          await tx.calendarRoute.createMany({
            data: routes.map((route) => ({
              fromId: route.fromId,
              toId: route.toId,
              kind: route.kind,
              enabled: route.enabled !== false,
            })),
          });
        }
      });
      return res.json({ ok: true, graph: await loadGraph(prisma) });
    } catch (error) {
      if (logger?.error) logger.error({ err: error }, 'calendar graph save failed');
      return res.status(503).json({ error: 'graph-save-failed' });
    }
  });

  // "What would a buyer see if the wiring were THIS?" Evaluates an unsaved draft
  // against live facts, so a cable can be tried before it is committed.
  router.post('/preview', async (req, res) => {
    const resource = String(req.body?.resource || '');
    if (!resourceSlugs().includes(resource)) return res.status(400).json({ error: 'unknown-resource' });
    const today = todayChicago();
    const from = isIsoDate(req.body?.from) ? req.body.from : today;
    const to = isIsoDate(req.body?.to) ? req.body.to : addDaysIso(from, 120);
    if (to < from || addDaysIso(from, MAX_PREVIEW_DAYS) < to) return res.status(400).json({ error: 'invalid-range' });

    let graph;
    if (req.body?.graph) {
      const problem = validateGraph(req.body.graph);
      if (problem) return res.status(400).json({ error: problem });
      graph = req.body.graph;
    }
    try {
      graph = graph || (await loadGraph(prisma));
      const facts = await loadFacts(prisma, { from, to });
      const days = resolveResourceDays({ resource, from, to, today, graph, facts });
      return res.json({ resource, from, to, days: days.map(({ date, status, source }) => ({ date, status, source })) });
    } catch (error) {
      if (logger?.error) logger.error({ err: error }, 'calendar preview failed');
      return res.status(503).json({ error: 'preview-unavailable' });
    }
  });

  return router;
}

module.exports = { createCalendarRouter };
