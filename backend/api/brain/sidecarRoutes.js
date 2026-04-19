/**
 * Brain sidecar trigger routes.
 *
 * POST /api/brain/sidecar/run   — trigger Python extraction pass (admin only)
 * GET  /api/brain/sidecar/status — last run result
 */

const { spawn } = require('child_process');
const path = require('path');
const { createAdminVerifier } = require('../utils/adminVerifier');

const verifyAdminRequest = createAdminVerifier();

let lastRun = null;
let running = false;

function registerSidecarRoutes(app, { logger } = {}) {
  app.post('/api/brain/sidecar/run', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });

      if (running) return res.status(409).json({ error: 'sidecar already running', lastRun });

      const { jobs } = req.body || {};
      const sidecarDir = path.resolve(__dirname, '../../../brain-sidecar');
      const args = jobs?.length ? jobs : [];

      running = true;
      const startedAt = new Date().toISOString();

      // Spawn Python sidecar — fire and forget, stream output to logger
      // Python 3.10+ required for instructor/pydantic union syntax
      const pythonBin = process.env.BRAIN_PYTHON_BIN || 'python3';
      const child = spawn(pythonBin, ['run.py', ...args], {
        cwd: sidecarDir,
        env: { ...process.env },
      });

      const output = [];
      child.stdout.on('data', d => {
        const line = d.toString().trim();
        if (line) {
          output.push(line);
          logger?.info({ line }, 'brain/sidecar: stdout');
        }
      });
      child.stderr.on('data', d => {
        logger?.warn({ line: d.toString().trim() }, 'brain/sidecar: stderr');
      });
      child.on('close', code => {
        running = false;
        lastRun = { startedAt, completedAt: new Date().toISOString(), exitCode: code, output };
        logger?.info({ exitCode: code }, 'brain/sidecar: process exited');
      });

      return res.json({ ok: true, status: 'started', startedAt });
    } catch (err) {
      running = false;
      logger?.error({ err }, 'brain/sidecar: spawn error');
      return res.status(500).json({ error: 'internal-error' });
    }
  });

  app.get('/api/brain/sidecar/status', async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin) return res.status(403).json({ error: 'admin only' });
      return res.json({ ok: true, running, lastRun });
    } catch (err) {
      return res.status(500).json({ error: 'internal-error' });
    }
  });
}

module.exports = { registerSidecarRoutes };
