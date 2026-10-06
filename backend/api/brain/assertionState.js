const { Prisma } = require('@prisma/client');

const SQL_ALIAS_PATTERN = /^[a-z][a-z0-9_]*$/i;

/**
 * Prisma where clause for an assertion that is known, not superseded or
 * retracted, and valid at `now`.
 */
function currentAssertionWhere(now = new Date()) {
  return {
    retractedAt: null,
    supersededAt: null,
    supersededBy: null,
    knownUntil: null,
    validFrom: { lte: now },
    OR: [
      { validUntil: null },
      { validUntil: { gt: now } },
    ],
  };
}

/**
 * SQL equivalent of currentAssertionWhere(). The alias is only accepted from
 * trusted call sites because it is interpolated as an identifier.
 */
function currentAssertionSql(alias = 'a') {
  if (!SQL_ALIAS_PATTERN.test(alias)) throw new Error('invalid assertion SQL alias');
  const a = Prisma.raw(alias);
  return Prisma.sql`
    ${a}."retractedAt" IS NULL
    AND ${a}."supersededAt" IS NULL
    AND ${a}."supersededBy" IS NULL
    AND ${a}."knownUntil" IS NULL
    AND ${a}."validFrom" <= CURRENT_TIMESTAMP
    AND (${a}."validUntil" IS NULL OR ${a}."validUntil" > CURRENT_TIMESTAMP)
  `;
}

module.exports = { currentAssertionWhere, currentAssertionSql };
