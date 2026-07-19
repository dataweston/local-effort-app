import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import llmJsonModule from '../llmJson';

const { hasLlm, llmJson } = llmJsonModule;
const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
const originalOpenAiKey = process.env.OPENAI_API_KEY;

describe('brain LLM JSON fallback', () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
  });

  it('reports whether either provider is configured', () => {
    expect(hasLlm()).toBe(false);
    process.env.OPENAI_API_KEY = 'test-openai-key';
    expect(hasLlm()).toBe(true);
  });

  it('uses OpenAI structured output when it is the configured provider', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ choices: [{ message: { content: '{"answer":"ok"}' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const schema = {
      type: 'object',
      properties: { answer: { type: 'string' } },
      required: ['answer'],
      additionalProperties: false,
    };
    const result = await llmJson({ prompt: 'Return ok', schema, schemaName: 'fallback_test' });

    expect(result).toEqual({ data: { answer: 'ok' }, via: 'openai' });
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request.response_format.json_schema).toMatchObject({ name: 'fallback_test', schema });
  });

  it('fails clearly when no provider is configured', async () => {
    await expect(llmJson({ prompt: 'test', schema: { type: 'object' } }))
      .rejects.toThrow('no ANTHROPIC_API_KEY or OPENAI_API_KEY set');
  });
});
