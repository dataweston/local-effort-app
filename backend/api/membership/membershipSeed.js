'use strict';

const { MEMBERSHIP_CLASSES } = require('./membershipClasses');

function persistedClass(definition) {
  return {
    code: definition.code,
    label: definition.label,
    duesCadence: definition.duesCadence,
    duesCents: definition.duesCents,
    entitlementSet: [...definition.entitlementSet],
    waivedEligible: definition.waivedEligible,
    accruesCoopCredit: definition.accruesCoopCredit,
    coopCreditBasisPoints: definition.coopCreditBasisPoints,
    coopCreditCadence: definition.coopCreditCadence,
    coopCreditNonExpiring: definition.coopCreditNonExpiring,
    active: true,
  };
}

function comparableClass(row) {
  if (!row) return null;
  return {
    code: row.code,
    label: row.label,
    duesCadence: row.duesCadence,
    duesCents: row.duesCents,
    entitlementSet: [...(row.entitlementSet || [])].sort(),
    waivedEligible: row.waivedEligible,
    accruesCoopCredit: row.accruesCoopCredit,
    coopCreditBasisPoints: row.coopCreditBasisPoints,
    coopCreditCadence: row.coopCreditCadence || null,
    coopCreditNonExpiring: row.coopCreditNonExpiring,
    active: row.active,
  };
}

function classesMatch(row, expected) {
  const normalized = comparableClass(row);
  if (!normalized) return false;
  return JSON.stringify(normalized) === JSON.stringify({
    ...expected,
    entitlementSet: [...expected.entitlementSet].sort(),
  });
}

/**
 * Plan or apply the owner-confirmed Localist class rows. Dry-run is the default;
 * callers must pass apply=true for writes. The apply path uses one transaction
 * so scope derivation never observes a partly seeded class set.
 */
async function seedMembershipClasses({ prisma, apply = false } = {}) {
  if (!prisma?.membershipClass?.findMany) {
    throw new TypeError('prisma.membershipClass.findMany is required');
  }
  if (apply && typeof prisma.$transaction !== 'function') {
    throw new TypeError('prisma.$transaction is required when apply=true');
  }

  const definitions = Object.values(MEMBERSHIP_CLASSES)
    .map(persistedClass)
    .sort((left, right) => left.code.localeCompare(right.code));
  const existing = await prisma.membershipClass.findMany({
    where: { code: { in: definitions.map((entry) => entry.code) } },
    orderBy: { code: 'asc' },
  });
  const byCode = new Map(existing.map((row) => [row.code, row]));
  const changes = definitions.map((definition) => ({
    code: definition.code,
    action: !byCode.has(definition.code)
      ? 'create'
      : classesMatch(byCode.get(definition.code), definition)
        ? 'none'
        : 'update',
  }));

  if (apply && changes.some((entry) => entry.action !== 'none')) {
    await prisma.$transaction(async (tx) => {
      for (const definition of definitions) {
        await tx.membershipClass.upsert({
          where: { code: definition.code },
          create: definition,
          update: definition,
        });
      }
    });
  }

  return Object.freeze({
    applied: Boolean(apply),
    classCount: definitions.length,
    createCount: changes.filter((entry) => entry.action === 'create').length,
    updateCount: changes.filter((entry) => entry.action === 'update').length,
    unchangedCount: changes.filter((entry) => entry.action === 'none').length,
    changes: Object.freeze(changes.map(Object.freeze)),
  });
}

module.exports = { persistedClass, seedMembershipClasses };
