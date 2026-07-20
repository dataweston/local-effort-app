/**
 * Economist MCP tools — read-only raise-evaluation surfaces.
 *
 *   economist.cashflow_actuals — proxy Local Budget /api/integration/v1/cashflow-actuals
 *   economist.latest_run       — latest committed le-economist model-run snapshot
 *   economist.current_facts    — serve current-facts.md verbatim
 *
 * All three are strictly read-only: no tool here may mutate financial data.
 * Dispatch in backend/api/index.js requires a configured bearer token carrying
 * the economist:read scope (bearer-only, same as brain.*) — these tools expose
 * private business financials and must never ride the self-asserted x-ucp-*
 * header path.
 */

const fs = require('fs');
const path = require('path');
const { z } = require('zod');

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function json(data) {
  return { content: [{ type: 'json', json: data }] };
}

// The skill references live outside backend/; resolve against the repo root in
// a local checkout and against the bundle root (cwd) when deployed. Bundling
// relies on the includeFiles glob for skills/le-economist/references/** in
// vercel.json — if that ever breaks, these tools degrade to a structured
// "not bundled" answer instead of crashing.
function referencesDir() {
  const candidates = [
    path.resolve(__dirname, '..', '..', 'skills', 'le-economist', 'references'),
    path.resolve(process.cwd(), 'skills', 'le-economist', 'references'),
  ];
  return candidates.find((dir) => fs.existsSync(dir)) || null;
}

function registerEconomistTools(server) {
  server.registerTool(
    'economist.cashflow_actuals',
    {
      title: 'Local Budget cashflow actuals',
      description: 'Read-only proxy of Local Budget GET /api/integration/v1/cashflow-actuals (contract v1, month grain, complete months only). Returns the upstream payload verbatim, including methodVersion and quality warnings.',
      inputSchema: z.object({
        from: z.string().regex(ISO_DAY, 'from must be YYYY-MM-DD'),
        to: z.string().regex(ISO_DAY, 'to must be YYYY-MM-DD (exclusive)'),
      }),
    },
    async ({ from, to }) => {
      const baseUrl = String(process.env.LOCAL_BUDGET_API_URL || '').trim().replace(/\/+$/, '');
      const token = String(process.env.LOCAL_BUDGET_API_TOKEN || '').trim();
      if (!baseUrl || !token) {
        return json({
          ok: false,
          status: 'local_budget_api_not_configured',
          detail: 'LOCAL_BUDGET_API_URL and LOCAL_BUDGET_API_TOKEN are not set in this deployment.',
        });
      }
      const url = new URL(`${baseUrl}/api/integration/v1/cashflow-actuals`);
      url.searchParams.set('from', from);
      url.searchParams.set('to', to);
      url.searchParams.set('grain', 'month');
      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (!response.ok) {
          const body = await response.text().catch(() => '');
          return json({
            ok: false,
            status: 'local_budget_api_error',
            httpStatus: response.status,
            detail: body.slice(0, 300),
          });
        }
        const payload = await response.json();
        if (payload?.contractVersion !== 1) {
          return json({
            ok: false,
            status: 'unsupported_cashflow_contract',
            contractVersion: payload?.contractVersion ?? null,
            detail: 'Upstream contract changed; update economistTools.js after reviewing the new contract.',
          });
        }
        return json({ ok: true, source: 'local_budget_api', payload });
      } catch (error) {
        return json({ ok: false, status: 'local_budget_api_unreachable', detail: error.message });
      }
    }
  );

  server.registerTool(
    'economist.latest_run',
    {
      title: 'Latest economist model run',
      description: 'Return the latest committed le-economist monthly model-run snapshot (references/runs/YYYY-MM.json), including methodVersion and blockedFields.',
      inputSchema: z.object({}),
    },
    async () => {
      const refs = referencesDir();
      if (!refs) {
        return json({ ok: false, status: 'references_not_bundled', detail: 'skills/le-economist/references is not present in this deployment bundle.' });
      }
      const runsDir = path.join(refs, 'runs');
      const runFiles = fs.existsSync(runsDir)
        ? fs.readdirSync(runsDir).filter((name) => /^\d{4}-\d{2}\.json$/.test(name)).sort()
        : [];
      if (!runFiles.length) {
        return json({
          ok: false,
          status: 'no_runs_available',
          detail: 'No model-run snapshots are committed. The snapshot-privacy decision in references/decisions-log.md is still open; runs stay out of the public repo until the owner resolves it. Ask the owner to run scripts/snapshot-month.cjs and share the output, or use economist.cashflow_actuals for cash actuals.',
        });
      }
      const latest = runFiles[runFiles.length - 1];
      const snapshot = JSON.parse(fs.readFileSync(path.join(runsDir, latest), 'utf8'));
      return json({ ok: true, file: latest, availableRuns: runFiles, snapshot });
    }
  );

  server.registerTool(
    'economist.current_facts',
    {
      title: 'Current economist facts',
      description: 'Serve skills/le-economist/references/current-facts.md verbatim. Check the recheck-by date in the header before relying on standing facts.',
      inputSchema: z.object({}),
    },
    async () => {
      const refs = referencesDir();
      const factsPath = refs && path.join(refs, 'current-facts.md');
      if (!factsPath || !fs.existsSync(factsPath)) {
        return json({ ok: false, status: 'references_not_bundled', detail: 'current-facts.md is not present in this deployment bundle.' });
      }
      return { content: [{ type: 'text', text: fs.readFileSync(factsPath, 'utf8') }] };
    }
  );
}

module.exports = { registerEconomistTools };
