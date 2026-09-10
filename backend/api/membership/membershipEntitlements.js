'use strict';

const { NON_PERIODIC_PERIOD_KEY } = require('./membershipClasses');

function requiredText(value, field) {
  const text = String(value || '').trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

/**
 * Build the only write path for membership entitlement grants.
 *
 * The compound natural key makes a retry return the existing row without
 * changing its provenance or grant time. Re-granting a revoked entitlement
 * requires a new period key or an explicit review path; retries never revive it.
 */
function createMembershipEntitlementGrantWriter({ prisma, now = () => new Date() } = {}) {
  if (!prisma?.membershipEntitlementGrant?.upsert) {
    throw new TypeError('prisma.membershipEntitlementGrant.upsert is required');
  }

  return async function grantMembershipEntitlement({
    membershipId,
    entitlementCode,
    periodKey = NON_PERIODIC_PERIOD_KEY,
    source,
    detail,
  } = {}) {
    const key = {
      membershipId: requiredText(membershipId, 'membershipId'),
      entitlementCode: requiredText(entitlementCode, 'entitlementCode'),
      periodKey: requiredText(periodKey, 'periodKey'),
    };
    const evidenceSource = requiredText(source, 'source');

    return prisma.membershipEntitlementGrant.upsert({
      where: { membershipId_entitlementCode_periodKey: key },
      create: {
        ...key,
        source: evidenceSource,
        grantedAt: now(),
        ...(detail === undefined ? {} : { detail }),
      },
      update: {},
    });
  };
}

module.exports = { createMembershipEntitlementGrantWriter };
