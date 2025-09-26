// backend/api/logger.js
// Centralized Pino logger with optional HTTP shipping
const pino = require('pino');
const os = require('os');
const crypto = require('crypto');

const level = process.env.LOG_LEVEL || 'info';
const pretty = (process.env.LOG_PRETTY || '').toLowerCase() === 'true';

const base = {
  service: 'backend-api',
  hostname: os.hostname(),
  pid: process.pid,
};

let transport;
if (pretty) {
  try {
    transport = pino.transport({ target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } });
  } catch (e) {
    // ignore if pino-pretty not installed in prod
  }
}

const logger = pino({ level, base }, transport);

// Lightweight batching shipper (best-effort)
const shipUrl = process.env.LOG_SHIP_ENDPOINT;
let buffer = [];
const maxBatch = 25;
const flushIntervalMs = 5000;
let flushing = false;

async function flush() {
  if (!shipUrl) return;
  if (flushing || buffer.length === 0) return;
  flushing = true;
  const batch = buffer.splice(0, maxBatch);
  try {
    await fetch(shipUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source: 'backend-api', events: batch })
    });
  } catch (e) {
    // requeue first failure once
    buffer = batch.concat(buffer);
  } finally {
    flushing = false;
  }
}

if (shipUrl) setInterval(flush, flushIntervalMs).unref();

function ship(logObj) {
  if (!shipUrl) return;
  buffer.push({ ...logObj, _ts: Date.now(), _id: crypto.randomUUID() });
  if (buffer.length >= maxBatch) flush();
}

// Wrap logger methods to also ship
const levels = ['trace','debug','info','warn','error','fatal'];
for (const lvl of levels) {
  const orig = logger[lvl].bind(logger);
  logger[lvl] = (obj, msg, ...rest) => {
    if (typeof obj === 'string') {
      ship({ level: lvl, msg: obj });
      return orig(obj, msg, ...rest);
    }
    ship({ level: lvl, ...(obj || {}), msg });
    return orig(obj, msg, ...rest);
  };
}

module.exports = { logger, ship };
