/**
 * Shared LLM JSON completion with provider fallback.
 *
 * Primary: Anthropic (ANTHROPIC_API_KEY) via @anthropic-ai/sdk structured output.
 * Backup:  OpenAI (OPENAI_API_KEY) via plain fetch — no SDK dependency needed —
 * used when the Anthropic key is missing or the call fails (e.g. the account
 * runs out of credit, which is exactly how the July 2026 triage outage started).
 *
 * Callers treat any throw as "LLM unavailable" and take their deterministic path.
 */

const ANTHROPIC_MODEL = () => process.env.BRAIN_TRIAGE_MODEL || 'claude-opus-4-8';
const OPENAI_MODEL = () => process.env.BRAIN_OPENAI_MODEL || 'gpt-4o-mini';
const REQUEST_TIMEOUT_MS = () => Math.max(1000, Number(process.env.BRAIN_LLM_TIMEOUT_MS) || 30000);

let anthropicClient = null;
function getAnthropic() {
  const Anthropic = require('@anthropic-ai/sdk');
  if (!anthropicClient) anthropicClient = new Anthropic();
  return anthropicClient;
}

async function anthropicJson({ prompt, schema, maxTokens = 1024, model }) {
  const response = await getAnthropic().messages.create(
    {
      model: model || ANTHROPIC_MODEL(),
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
      output_config: { format: { type: 'json_schema', schema } },
    },
    { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS()) },
  );
  const out = response.content.find((b) => b.type === 'text')?.text;
  if (!out) throw new Error('empty model response');
  return JSON.parse(out);
}

async function openaiJson({ prompt, schema, maxTokens = 1024, schemaName = 'result' }) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS()),
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL(),
      max_completion_tokens: maxTokens,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
      // strict:false — our schemas use optional properties, which strict mode rejects.
      response_format: { type: 'json_schema', json_schema: { name: schemaName, schema, strict: false } },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`openai HTTP ${res.status}: ${body?.error?.message || 'unknown error'}`);
  }
  const out = body.choices?.[0]?.message?.content;
  if (!out) throw new Error('empty model response');
  return JSON.parse(out);
}

function hasLlm() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

/**
 * JSON completion with fallback. Returns { data, via: 'claude'|'openai' }.
 * Throws only when every configured provider failed (or none is configured).
 */
async function llmJson(opts) {
  const errors = [];
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return { data: await anthropicJson(opts), via: 'claude' };
    } catch (err) {
      errors.push(`anthropic: ${err.message}`);
    }
  }
  if (process.env.OPENAI_API_KEY) {
    try {
      return { data: await openaiJson(opts), via: 'openai' };
    } catch (err) {
      errors.push(`openai: ${err.message}`);
    }
  }
  throw new Error(`llm unavailable: ${errors.join(' | ') || 'no ANTHROPIC_API_KEY or OPENAI_API_KEY set'}`);
}

module.exports = { llmJson, hasLlm };
