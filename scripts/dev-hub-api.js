require('dotenv').config();

const express = require('express');

const app = express();
const port = Number(process.env.HUB_DEV_API_PORT || process.env.PORT || 3001);

app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  return next();
});

function mount(path, handlerPath) {
  app.all(path, async (req, res, next) => {
    try {
      await require(handlerPath)(req, res);
    } catch (err) {
      next(err);
    }
  });
}

mount('/api/hub/profile', '../api-handlers/hub/profile');
mount('/api/hub/people', '../api-handlers/hub/people');
mount('/api/hub/docs', '../api-handlers/hub/docs');
mount('/api/hub/conversations', '../api-handlers/hub/conversations');
mount('/api/hub/invites', '../api-handlers/hub/invites');
mount('/api/hub/localist-menu', '../api-handlers/hub/localist-menu');
mount('/api/hub/localist-window', '../api-handlers/hub/localist-window');
mount('/api/hub/localist-checkout', '../api-handlers/hub/localist-checkout');
mount('/api/hub/localist-orders', '../api-handlers/hub/localist-orders');
mount('/api/hub/localist-chat', '../api-handlers/hub/localist-chat');
mount('/api/hub/localist-activity', '../api-handlers/hub/localist-activity');
mount('/api/hub/shifts', '../api-handlers/hub/shifts');
mount('/api/hub/brain-publish', '../api-handlers/hub/brain-publish');
mount('/api/hub/economics-model', '../api-handlers/hub/economics-model');
mount('/api/hub/today', '../api-handlers/hub/today');
mount('/api/hub/calendar', '../api-handlers/hub/calendar');
mount('/api/hub/inbox', '../api-handlers/hub/inbox');
mount('/api/hub/spaces', '../api-handlers/hub/spaces');
mount('/api/hub/objects/:id/plan', '../api-handlers/hub/object-plan');
mount('/api/hub/objects/:id', '../api-handlers/hub/objects');
mount('/api/hub/objects', '../api-handlers/hub/objects');
mount('/api/hub/threads/:id/messages', '../api-handlers/hub/thread-messages');
mount('/api/hub/threads', '../api-handlers/hub/threads');
mount('/api/hub/capture/suggestions', '../api-handlers/hub/capture-suggestions');
mount('/api/hub/feedback', '../api-handlers/hub/feedback');
mount('/api/hub/capture', '../api-handlers/hub/capture');
mount('/api/hub/checkins', '../api-handlers/hub/checkins');
mount('/api/hub/push/register', '../api-handlers/hub/push-register');

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'hub-dev-api' });
});

app.use((err, _req, res, _next) => {
  console.error('[dev-hub-api] handler failed', err);
  res.status(500).json({ error: 'dev-hub-api-error', message: err?.message || 'unknown error' });
});

app.listen(port, () => {
  console.log(`hub dev api listening on ${port}`);
});
