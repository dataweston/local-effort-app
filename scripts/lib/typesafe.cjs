/**
 * Minimal TypeSafe System One client.
 *
 * One endpoint, one call shape: POST a `state` plus a map of typed `questions`,
 * get back one answer per question key. See https://docs.typesafe.ai/api
 *
 * The API key is read from TYPESAFE_API_KEY and never leaves the server. Do not
 * expose it through a VITE_ variable -- those are inlined into the client bundle.
 */

const ENDPOINT = process.env.TYPESAFE_ENDPOINT || 'https://api.typesafe.ai/v1/systemone';

/** Statuses the docs tell us to back off on rather than fail. */
const RETRYABLE = new Set([429, 529]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Ask one state a map of questions.
 *
 * @param {object} opts
 * @param {string|object|Array} opts.state    content to evaluate
 * @param {object} opts.questions             map of id -> {type, instructions, criteria}
 * @param {string} [opts.model]               defaults to jev-latest
 * @param {number} [opts.attempts]            total tries before giving up
 * @returns {Promise<{model:string, answers:object, usage:object}>}
 */
async function systemOne({ state, questions, model = 'jev-latest', attempts = 4, timeoutMs = 120000 }) {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    throw new Error('TYPESAFE_API_KEY is not set. Add it to .env (server-side only, never VITE_).');
  }

  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state, model, questions }),
        signal: controller.signal,
      });

      if (res.ok) return await res.json();

      const body = await res.text().catch(() => '');
      // 401/422 are our bug, not a blip -- surface immediately instead of burning retries.
      if (!RETRYABLE.has(res.status)) {
        throw new Error(`TypeSafe ${res.status}: ${body.slice(0, 600)}`);
      }
      lastErr = new Error(`TypeSafe ${res.status}: ${body.slice(0, 200)}`);
    } catch (err) {
      if (err.message && err.message.startsWith('TypeSafe 4') && !err.message.startsWith('TypeSafe 429')) throw err;
      lastErr = err;
    } finally {
      clearTimeout(timer);
    }

    if (attempt < attempts) await sleep(2 ** attempt * 500);
  }
  throw lastErr || new Error('TypeSafe request failed');
}

module.exports = { systemOne, ENDPOINT };
