const { z } = require('zod');

const llmCopySchema = z.object({
  welcomeText: z.string().min(1).max(280),
  reasonCodes: z.array(z.string()).max(8).default([]),
});

function buildLlmPayload({ context, selected }) {
  return {
    page: context.page,
    acquisition: context.acquisition,
    visitor: context.visitor,
    session: {
      cartItemCount: context.session.cartItemCount,
      depth: context.session.depth,
      hasHighIntent: context.session.hasHighIntent,
    },
    selected: {
      strategy: selected.strategy,
      priorities: selected.businessPriorities.map((priority) => ({
        id: priority.id,
        label: priority.label,
        reasons: priority.reasons,
        messageFacts: priority.messageFacts,
      })),
      suggestedActions: selected.suggestedActions,
      reasonCodes: selected.reasonCodes,
    },
    constraints: {
      maxWords: context.constraints.maxWords || 32,
      tone: context.constraints.tone || 'helpful, concise, commercially aligned, non-creepy',
      mustNotClaim: context.constraints.mustNotClaim || [],
    },
  };
}

function extractOutputText(response) {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }
  if (Array.isArray(response?.output)) {
    for (const item of response.output) {
      if (!Array.isArray(item?.content)) continue;
      for (const content of item.content) {
        if (typeof content?.text === 'string' && content.text.trim()) {
          return content.text.trim();
        }
      }
    }
  }
  return '';
}

function createLlmCopyService({
  logger,
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.DECISION_LLM_MODEL || 'gpt-5.4-mini',
  baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  fetchImpl = global.fetch,
  timeoutMs = Number(process.env.DECISION_LLM_TIMEOUT_MS || 2500),
} = {}) {
  async function generateCopy({ context, selected }) {
    if (!apiKey || typeof fetchImpl !== 'function') {
      return { ok: false, reason: 'llm-unavailable' };
    }

    const payload = buildLlmPayload({ context, selected });
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_output_tokens: 180,
          input: [
            {
              role: 'system',
              content: [
                {
                  type: 'input_text',
                  text: 'You rewrite website concierge welcome copy. Keep it short, commercially useful, and not creepy. Return strict JSON with welcomeText and optional reasonCodes only.',
                },
              ],
            },
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: JSON.stringify(payload),
                },
              ],
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'decision_welcome_copy',
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  welcomeText: { type: 'string' },
                  reasonCodes: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
                required: ['welcomeText'],
              },
            },
          },
        }),
        signal: controller?.signal,
      });

      if (!response.ok) {
        logger?.warn?.({ status: response.status }, 'decision llm copy request failed');
        return { ok: false, reason: 'llm-http-error' };
      }

      const data = await response.json();
      const outputText = extractOutputText(data);
      const parsed = llmCopySchema.parse(JSON.parse(outputText));
      return {
        ok: true,
        welcomeText: parsed.welcomeText,
        reasonCodes: parsed.reasonCodes,
        model,
      };
    } catch (err) {
      logger?.warn?.({ err }, 'decision llm copy fallback');
      return { ok: false, reason: 'llm-fallback' };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  return {
    generateCopy,
  };
}

module.exports = {
  buildLlmPayload,
  createLlmCopyService,
  llmCopySchema,
};
