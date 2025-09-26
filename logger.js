// Root server logger (pino) with optional shipping
const pino = require('pino');
const os = require('os');

const level = process.env.LOG_LEVEL || 'info';
const pretty = (process.env.LOG_PRETTY || '').toLowerCase() === 'true';
let transport;
if (pretty) {
  try {
    transport = pino.transport({ target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } });
  } catch (e) {
    // ignore missing pino-pretty in production
  }
}
const logger = pino({ level, base: { service: 'web-server', hostname: os.hostname(), pid: process.pid } }, transport);
module.exports = logger;
