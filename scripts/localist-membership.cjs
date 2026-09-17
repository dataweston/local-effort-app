#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { prisma } = require('../api-handlers/_lib/prisma');
const { getSupabase } = require('../backend/api/supabaseClient');
const { seedMembershipClasses } = require('../backend/api/membership/membershipSeed');

async function rosterAudit() {
  const supabase = getSupabase();
  if (!supabase) {
    return { available: false, rowCount: null, matchedProfileCount: null };
  }

  const { data, error } = await supabase
    .from('localist_members')
    .select('id,email,tier,status');
  if (error) throw new Error(`Localist roster audit failed: ${error.message || error.code}`);

  const rows = Array.isArray(data) ? data : [];
  const emails = [...new Set(rows
    .map((row) => String(row.email || '').trim().toLowerCase())
    .filter(Boolean))];
  const matchedProfileCount = emails.length
    ? await prisma.hubProfile.count({ where: { email: { in: emails } } })
    : 0;

  return {
    available: true,
    rowCount: rows.length,
    rowsWithEmail: emails.length,
    matchedProfileCount,
    unmatchedProfileCount: Math.max(0, emails.length - matchedProfileCount),
  };
}

async function main() {
  if (!prisma) throw new Error('Prisma database unavailable');
  const apply = process.argv.includes('--apply');
  const classSeed = await seedMembershipClasses({ prisma, apply });
  const [roster, organization, canonicalCounts] = await Promise.all([
    rosterAudit(),
    prisma.hubOrganization.findUnique({
      where: { slug: 'local-effort' },
      select: { id: true, name: true, slug: true },
    }),
    Promise.all([
      prisma.membership.count(),
      prisma.membershipDuesPlan.count(),
      prisma.membershipEntitlementGrant.count(),
    ]),
  ]);

  const [membershipCount, duesPlanCount, entitlementGrantCount] = canonicalCounts;
  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    organization,
    classSeed,
    canonical: { membershipCount, duesPlanCount, entitlementGrantCount },
    legacyRoster: roster,
    membershipBackfill: {
      applied: false,
      eligibleRows: 0,
      reason: roster.rowCount === 0
        ? 'No legacy roster rows exist to backfill.'
        : 'Legacy roster rows do not contain membership-agreement acceptance evidence; canonical activation remains fail-closed.',
    },
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error?.stack || error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prisma?.$disconnect) await prisma.$disconnect();
  });
