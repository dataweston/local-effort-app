/*
 * Lightweight hub handler smoke test.
 *
 * This does not require a Supabase token. It verifies each handler loads and
 * reaches hub auth by expecting 401 Unauthorized for protected endpoints.
 */
const cases = [
  ['GET', 'today', '../api-handlers/hub/today', {}],
  ['GET', 'calendar', '../api-handlers/hub/calendar', {}],
  ['GET', 'inbox', '../api-handlers/hub/inbox', {}],
  ['GET', 'spaces', '../api-handlers/hub/spaces', {}],
  ['GET', 'threads', '../api-handlers/hub/threads', {}],
  ['GET', 'capture-suggestions', '../api-handlers/hub/capture-suggestions', {}],
  ['POST', 'capture', '../api-handlers/hub/capture', {}],
  ['POST', 'feedback', '../api-handlers/hub/feedback', {}],
  ['POST', 'checkins', '../api-handlers/hub/checkins', {}],
  ['POST', 'push-register', '../api-handlers/hub/push-register', {}],
  ['POST', 'resolve-dish', '../api-handlers/hub/resolve-dish', { name: 'test' }],
  ['GET', 'meal-prep-rollup', '../api-handlers/hub/meal-prep-rollup', {}],
  ['GET', 'meal-prep-labels', '../api-handlers/hub/meal-prep-labels', {}],
  ['GET', 'customer-profile', '../api-handlers/hub/customer-profile', {}],
  ['GET', 'customer-week', '../api-handlers/hub/customer-week', {}],
  ['GET', 'master-menu', '../api-handlers/hub/master-menu', {}],
  ['GET', 'house-notepad-canon', '../api-handlers/hub/house-notepad-canon', {}],
];

function createReq(method, body) {
  return {
    method,
    headers: {},
    query: {},
    params: {},
    body,
  };
}

function createRes(label) {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      console.info(`[hub-smoke] ${label} ${this.statusCode}`);
      return this;
    },
  };
}

async function main() {
  let failures = 0;

  for (const [method, label, modulePath, body] of cases) {
    const handler = require(modulePath);
    const req = createReq(method, body);
    const res = createRes(label);
    await handler(req, res);
    if (res.statusCode !== 401) {
      failures += 1;
      console.error(`[hub-smoke] expected ${label} to return 401, got ${res.statusCode}`);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[hub-smoke] failed', error);
  process.exitCode = 1;
});
