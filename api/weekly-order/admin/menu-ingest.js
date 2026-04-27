/**
 * POST /api/weekly-order/admin/menu-ingest
 *
 * Accepts a photo (base64) or raw text of a handwritten/typed menu and
 * returns structured dish drafts ready for review. Stateless — nothing is
 * written to the database. Call menu-publish.js after approval.
 *
 * Body (JSON):
 *   { text: "..." }                              — typed or pasted text
 *   { imageBase64: "...", mimeType: "image/jpeg" } — photo of handwritten menu
 *   { imageUrl: "https://..." }                  — publicly accessible image URL
 *
 * Optional:
 *   { clientSlugs: ["kara", "alex"] }  — pre-populate which clients see this menu
 *
 * Response:
 *   { dishes: [{ title, description, tags, allergens, clientSlugs }], rawText }
 */

const { PrismaClient } = require('@prisma/client');
const { requireWeeklyOrderAdmin } = require('../../../api-handlers/weekly-order/admin/_auth');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_MODEL = process.env.MENU_INGEST_OPENAI_MODEL || process.env.DECISION_LLM_MODEL || 'gpt-5.4-mini';
const ANTHROPIC_MODEL = process.env.MENU_INGEST_ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';

let prisma = null;
try { prisma = new PrismaClient(); } catch (_) { prisma = null; }

const SYSTEM_PROMPT = `You are a structured data extractor for a meal prep business. Your job is to parse menus — whether typed, photographed, or handwritten — into clean JSON.

Rules:
- Each dish gets its own object. Never merge two dishes into one.
- "title": Title Case dish name, trimmed to the essential identity. "Grandma's slow-roasted pork shoulder with fennel" → "Pork Shoulder". Keep proper nouns correct (Pad Thai, Caesar Salad).
- "description": Comma-separated supporting ingredients in lowercase. 3–6 items is ideal. Strip filler words ("with", "served on"). Include parenthetical serving notes like "(hot or cold)" attached to the relevant ingredient.
- "tags": Array of applicable strings from: breakfast, lunch, dinner, kids, vegetarian, vegan, gluten-free, dairy-free, snack. Infer from context when obvious.
- "allergens": Array of applicable strings from: dairy, wheat, soy, nuts, sesame, fish, shellfish, egg. Infer from ingredients.
- "clientSlugs": Array — leave empty [], the user will assign clients after review.
- "notes": Any quantity, multiplier, or special instruction that doesn't fit above. Leave "" if none.

If the input contains section headers like "Lunch:", "Kids:", "Dinner:" — use them to populate tags. If a dish appears under "Kids:" add "kids" to its tags.

Respond with ONLY valid JSON: { "dishes": [...], "rawText": "the normalized text you saw" }`;

function extractJson(text) {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenceMatch ? fenceMatch[1].trim() : text.trim();
  return JSON.parse(raw);
}

function extractOpenAiOutputText(response) {
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

async function callClaude(messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function callOpenAi({ text, imageBase64, mimeType, imageUrl }) {
  const content = [];

  if (text) {
    content.push({
      type: 'input_text',
      text: `Parse all dishes from this menu text:\n\n${text}`,
    });
  } else {
    content.push({
      type: 'input_text',
      text: 'Parse all dishes from this menu image into the JSON format described.',
    });
    if (imageBase64) {
      const safeMimeType = (mimeType || 'image/jpeg').replace(/[^a-z0-9/+.-]/gi, '') || 'image/jpeg';
      content.push({
        type: 'input_image',
        image_url: `data:${safeMimeType};base64,${imageBase64}`,
      });
    } else if (imageUrl) {
      content.push({
        type: 'input_image',
        image_url: imageUrl,
      });
    }
  }

  const response = await fetch(`${OPENAI_BASE_URL.replace(/\/$/, '')}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_output_tokens: 2500,
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: SYSTEM_PROMPT }],
        },
        {
          role: 'user',
          content,
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'weekly_order_menu_ingest',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              dishes: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    tags: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    allergens: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    clientSlugs: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    notes: { type: 'string' },
                  },
                  required: ['title', 'description', 'tags', 'allergens', 'clientSlugs', 'notes'],
                },
              },
              rawText: { type: 'string' },
            },
            required: ['dishes', 'rawText'],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const raw = extractOpenAiOutputText(data);
  return extractJson(raw);
}

async function parseMenu(payload) {
  const failures = [];

  if (OPENAI_API_KEY) {
    try {
      return await callOpenAi(payload);
    } catch (err) {
      failures.push(`OpenAI: ${err.message}`);
    }
  }

  if (ANTHROPIC_API_KEY) {
    try {
      let content;
      if (payload.imageBase64) {
        const type = (payload.mimeType || 'image/jpeg').replace(/[^a-z/]/g, '');
        content = [
          {
            type: 'image',
            source: { type: 'base64', media_type: type, data: payload.imageBase64 },
          },
          {
            type: 'text',
            text: 'Parse all dishes from this menu image into the JSON format described.',
          },
        ];
      } else if (payload.imageUrl) {
        content = [
          {
            type: 'image',
            source: { type: 'url', url: payload.imageUrl },
          },
          {
            type: 'text',
            text: 'Parse all dishes from this menu image into the JSON format described.',
          },
        ];
      } else {
        content = [
          {
            type: 'text',
            text: `Parse all dishes from this menu text:\n\n${payload.text}`,
          },
        ];
      }

      const response = await callClaude([{ role: 'user', content }]);
      const raw = response.content?.[0]?.text || '';
      return extractJson(raw);
    } catch (err) {
      failures.push(`Anthropic: ${err.message}`);
    }
  }

  if (!OPENAI_API_KEY && !ANTHROPIC_API_KEY) {
    throw new Error('No AI provider configured');
  }

  throw new Error(failures.join(' | '));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const admin = await requireWeeklyOrderAdmin(req, res);
  if (!admin) return;

  const { text, imageBase64, mimeType, imageUrl, clientSlugs = [] } = req.body || {};

  if (!text && !imageBase64 && !imageUrl) {
    return res.status(400).json({ error: 'Provide text, imageBase64, or imageUrl' });
  }

  let parsed;
  try {
    parsed = await parseMenu({ text, imageBase64, mimeType, imageUrl });
  } catch (err) {
    console.error('[menu-ingest] parse error', err);
    return res.status(502).json({ error: 'Failed to parse menu', detail: err.message });
  }

  if (!Array.isArray(parsed.dishes)) {
    return res.status(502).json({ error: 'Unexpected Claude response shape', raw: parsed });
  }

  // Fetch existing dishes from DB so the UI can show match suggestions
  let existingDishes = [];
  if (prisma) {
    try {
      existingDishes = await prisma.dish.findMany({
        select: { id: true, title: true },
        where: { status: { not: 'archived' } },
        orderBy: { title: 'asc' },
      });
    } catch (err) {
      console.warn('[menu-ingest] Could not load existing dishes', err.message);
    }
  }

  // Attempt fuzzy title match for each parsed dish
  const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const tokenize = (s) => normalize(s).split(' ').filter(Boolean);
  const jaccard = (a, b) => {
    const sa = new Set(a), sb = new Set(b);
    const inter = [...sa].filter(t => sb.has(t)).length;
    const union = new Set([...sa, ...sb]).size;
    return union ? inter / union : 0;
  };

  const dishes = parsed.dishes.map((dish) => {
    const candidateTokens = tokenize(dish.title);
    let bestMatch = null;
    let bestScore = 0;
    for (const existing of existingDishes) {
      const score = jaccard(candidateTokens, tokenize(existing.title));
      if (score > bestScore) { bestScore = score; bestMatch = existing; }
    }
    return {
      title: dish.title || '',
      description: dish.description || '',
      tags: Array.isArray(dish.tags) ? dish.tags : [],
      allergens: Array.isArray(dish.allergens) ? dish.allergens : [],
      notes: dish.notes || '',
      clientSlugs: Array.isArray(dish.clientSlugs) ? dish.clientSlugs : clientSlugs,
      // Suggest an existing dish if confidence is high enough
      matchedDishId: bestScore >= 0.6 ? bestMatch?.id : null,
      matchedDishTitle: bestScore >= 0.6 ? bestMatch?.title : null,
      matchScore: Math.round(bestScore * 100) / 100,
    };
  });

  return res.status(200).json({
    ok: true,
    dishes,
    rawText: parsed.rawText || text || '',
    existingDishCount: existingDishes.length,
  });
};
