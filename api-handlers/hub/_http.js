function methodNotAllowed(res, methods) {
  res.setHeader('Allow', methods.join(', '));
  return res.status(405).json({ error: 'Method not allowed' });
}

function asIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function cleanString(value, max = 500) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function tableMissing(err) {
  return err?.code === 'P2021' || /table .* does not exist/i.test(String(err?.message || ''));
}

async function safePrisma(fallback, fn) {
  try {
    return await fn();
  } catch (err) {
    if (tableMissing(err)) return fallback;
    throw err;
  }
}

module.exports = { methodNotAllowed, asIso, cleanString, tableMissing, safePrisma };
