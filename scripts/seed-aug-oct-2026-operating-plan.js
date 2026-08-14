#!/usr/bin/env node
/*
 * Seed the Aug-Oct 2026 Local Effort execution plan into Planner.
 *
 * Dry run:
 *   node scripts/seed-aug-oct-2026-operating-plan.js
 * Apply:
 *   node scripts/seed-aug-oct-2026-operating-plan.js --apply
 *
 * Requires DATABASE_URL plus HUB_MASTER_SUPABASE_UID (or VITE_HUB_MASTER_SUPABASE_UID).
 * Idempotent: stable project slugs and card IDs; completed cards stay completed.
 *
 * Public-repo rule: do not hardcode customer PII or private email bodies here.
 * Pull exact private-event/contact/application details from internal systems at execution time.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const UID = process.env.HUB_MASTER_SUPABASE_UID || process.env.VITE_HUB_MASTER_SUPABASE_UID;

const projects = [
  ['capital-2026', 'Capital / Financing', '#315b71', 20, 'Wefunder, Shared Capital, Groove Capital, MCCD/public financing, grants, and the capital data room.', null],
  ['marsh-rfp-2026', 'The Marsh RFP', '#7a5d2d', 21, 'City of Minnetonka RFP for café operations at The Marsh.', '2026-08-31'],
  ['sales-growth-2026', 'Sales / Revenue', '#56723b', 22, 'Build the sales operating layer across Brain, Hub, Planner, and existing commerce infrastructure.', null],
  ['founder-platform-2026', 'Founder Platform', '#72527c', 23, 'Founder site, publishing, cultural PR, writing, media, film/TV, and food-styling opportunities.', null],
  ['speaking-2026', 'Speaking', '#8b5745', 24, 'Chef/local-food/small-business/cooperative speaking pipeline; intentionally separate from cultural PR.', null],
  ['private-events-2026', 'Private Events', '#6f6b3f', 25, 'Confirmed and prospective private-event work requiring operator follow-through.', null],
];

const cards = [
  // Capital
  card('op26-capital-owner-uses', 'capital-2026', 'OWNER INPUT — final use-of-funds list', '2026-08-17', '2026-08-21', 3,
    'Owner-authored input. Do not invent categories or amounts. Capital Master Record v2.3 preliminary uses are not final.', 'blocked'),
  card('op26-mccd-schedule', 'capital-2026', 'MCCD — send meeting options for after third week of September', '2026-08-17', '2026-08-18', 3,
    'Retrieve the current MCCD Gmail thread. Send several date/time options now for a meeting after the third week of September. External send requires owner approval per AGENTS.md.'),
  card('op26-shared-capital-packet', 'capital-2026', 'Shared Capital — assemble prerequisite packet', '2026-08-17', '2026-08-24', 3,
    'Use the current “Next Steps for Your Project” Gmail thread. Required groups include formation/governance documents, pro forma statements, historical tax returns, business plan, and board information. Request the application link only after the packet is ready.'),
  card('op26-groove-apply', 'capital-2026', 'Groove Capital — acknowledge invitation + submit application', '2026-08-17', '2026-08-25', 2,
    'Retrieve Reed Robinson/Groove Gmail thread. Acknowledge receipt; submit the investment application, or use office hours first only if a material preparation question remains.'),
  card('op26-capital-refresh-actuals', 'capital-2026', 'Refresh lender-grade cash, debt, AP/AR, tax and actuals', '2026-08-17', '2026-08-20', 3,
    'Use Local Budget/current native systems and Capital Master Record v2.3 evidence hierarchy. Do not substitute stale planning figures.'),
  card('op26-capital-founder-reconcile', 'capital-2026', 'Finish founder draw / deferred-comp reconciliation', '2026-08-17', '2026-08-21', 2,
    'Use Capital Master Record v2.3 and current Local Budget. Resolve remaining owner/accountant treatment rather than carrying conversation estimates.'),
  card('op26-capital-model', 'capital-2026', 'Build authoritative 13-month capital cash model', '2026-08-20', '2026-08-25', 3,
    'Start from current unrestricted cash. Use Capital Master Record v2.3 inputs, owner-authored uses of funds, current debt, staged labor, downside/base/upside cases, hiring gates and reserve floor.'),
  card('op26-wefunder-instrument', 'capital-2026', 'Wefunder — resolve working security for owner/counsel review', '2026-08-20', '2026-08-28', 3,
    'Security is unresolved. Master Record v2.3 carries an older 6% cumulative-return concept; later strategy explored an 8% accruing convertible note compatible with cooperative/nonvoting investor equity. Do not publish terms until owner + securities counsel/Wefunder confirm.'),
  card('op26-wefunder-data-room', 'capital-2026', 'Wefunder — data room + campaign evidence package', '2026-08-24', '2026-09-04', 3,
    'Build financial highlights, risk/FAQ, data-room checklist, founder/company narrative and evidence. Use the current master record and current actuals.'),
  card('op26-wefunder-soft-list', 'capital-2026', 'Wefunder — build initial investor / soft-launch list', '2026-08-24', '2026-09-04', 2,
    'Build a qualified existing-network list and identify likely anchors. Do not assume anonymous Wefunder traffic will fund the round from zero.'),
  card('op26-grants-financing-scan', 'capital-2026', 'Complementary grants / lower-cost financing review', '2026-09-01', '2026-09-11', 1,
    'Refresh only current/open programs applicable to the cooperative, Hopkins base, food business and majority-women ownership. Keep separate from arbitrary total-capital targets.'),
  card('op26-mccd-meeting-window', 'capital-2026', 'MCCD — hold shared-ownership financing meeting', '2026-09-21', '2026-09-30', 2,
    'Meeting window begins after the third week of September. Bring current master record, 13-month model, proposed Wefunder structure, owner uses of funds and questions about lowest-cost complementary capital.'),
  card('op26-wefunder-launch-gate', 'capital-2026', 'Wefunder — public-launch gate review', '2026-09-21', '2026-10-02', 2,
    'Go public only when campaign disclosures/evidence are ready and initial investor momentum is credible. If not, keep working the soft-launch network rather than forcing the date.'),

  // The Marsh
  card('op26-marsh-site', 'marsh-rfp-2026', 'The Marsh — site visit + questions', '2026-08-17', '2026-08-21', 3,
    'Hard RFP window. Review facility, equipment, utilities, hours, staffing, licensing, transition, lease/revenue-share economics and any operational dependencies. Use the actual RFP attachment.'),
  card('op26-marsh-proposal', 'marsh-rfp-2026', 'The Marsh — submit café proposal', '2026-08-24', '2026-08-31', 3,
    'Hard deadline Aug. 31. Proposal must answer the actual RFP requirements, including concept/menu/pricing, hours/staffing, customer service, financial proposal, capability, transition and facility needs.'),
  eventCard('op26-marsh-selection', 'marsh-rfp-2026', 'The Marsh — expected operator selection', '2026-09-18', 1,
    'RFP proposed selection date. Treat as expected, not guaranteed; update if the City changes the timeline.'),

  // Sales
  card('op26-sales-mvp', 'sales-growth-2026', 'Sales layer MVP — Brain → Hub → Planner', '2026-08-24', '2026-09-11', 2,
    'Operator should see: who to contact; closest opportunities; reorder candidates; channel contribution; expected 7/30/90-day revenue. Target flow: Lead → Opportunity → Transaction → Customer → Reorder. Keep Square as transaction infrastructure for now.'),
  card('op26-sales-weekly-review', 'sales-growth-2026', 'Install weekly sales-pipeline review', '2026-09-11', '2026-09-18', 1,
    'Turn the MVP into an operator cadence: next actions, stale leads, reorders, subscriptions, revenue forecast and channel contribution.'),

  // Founder platform
  card('op26-founder-site', 'founder-platform-2026', 'Founder site — minimum viable publish', '2026-08-31', '2026-09-18', 1,
    'Minimum: bio, selected work/gallery, Local Effort context, writing, speaking/media contact. Serve press/agencies, conference programmers, editors/publishers and film/TV producers.'),
  card('op26-cultural-pr', 'founder-platform-2026', 'Cultural PR — approved-target outreach', '2026-09-07', '2026-09-25', 1,
    'Use the separately approved boutique cultural-PR target list. Goal: collaborations and possibly representation. Do not mix this lane with speaking research.'),
  card('op26-writing-package', 'founder-platform-2026', 'Writing — package three active projects', '2026-09-14', '2026-10-02', 1,
    'Prepare premise, sample, audience and pitch targets for: “What We’re Doing / Who I Am”; “Local Effort, a practice for eating well”; “Substance 2”.'),
  card('op26-media-styling', 'founder-platform-2026', 'Film / TV / food-styling opportunity packet', '2026-09-28', '2026-10-09', 1,
    'Create a concise proof-of-work/availability packet and targeted outreach list without diluting core operating work.'),

  // Speaking
  card('op26-speak-marbleseed', 'speaking-2026', 'Speaking — Marbleseed 2027 proposal', '2026-08-17', '2026-08-28', 3,
    'Hard deadline Aug. 28, 2026. Position around local ingredients, food business/cooperative operations, chef practice and regional food systems—not cultural PR.'),
  card('op26-speak-pasa', 'speaking-2026', 'Speaking — Pasa 2027 late/direct pitch', '2026-08-24', '2026-08-31', 2,
    'Formal July 1 deadline passed; Pasa states later proposals may be considered case-by-case. Contact conference staff with a strong fit before investing in a full proposal.'),
  card('op26-speak-mn-organic', 'speaking-2026', 'Speaking — Minnesota Organic Conference late/direct pitch', '2026-08-31', '2026-09-04', 2,
    'Previously selected lead. Reverify current organizer process before outreach; treat as a late/direct pitch rather than an open CFP unless current evidence says otherwise.'),
  card('op26-speak-ca-small-farm', 'speaking-2026', 'Speaking — California Small Farm Conference workshop proposal', '2026-09-01', '2026-09-15', 3,
    'Hard current deadline Sep. 15, 2026. Pitch a session that fits small-farm/food-system business practice and Local Effort’s relevant operator experience.'),
  card('op26-speak-sfa', 'speaking-2026', 'Speaking — SFA 2027 Annual Conference pitch/monitor', '2026-09-07', '2026-09-18', 1,
    'Conference is Feb. 6, 2027 in St. Joseph, MN. Programming details are still emerging; monitor and make a direct relationship pitch when appropriate.'),
  card('op26-speak-mn-coop', 'speaking-2026', 'Speaking — Minnesota Cooperative Summit 2027', '2026-09-07', '2026-09-18', 1,
    'Previously selected cooperative-speaking lead. Reverify 2027 programming and pitch a practical worker-cooperative/food-business session.'),
  card('op26-speak-mfu', 'speaking-2026', 'Speaking — Minnesota Farmers Union / Minnesota Cooks', '2026-09-07', '2026-09-18', 1,
    'Ongoing/direct relationship lane for farmer-chef/local-food programming; no invented CFP deadline.'),
  card('op26-speak-upcoming-coops', 'speaking-2026', 'Speaking — Up & Coming Food Co-op Conference', '2026-09-07', '2026-09-18', 1,
    'Monitor 2027 programming; pitch when a concrete presenter path opens.'),
  card('op26-speak-nfu-college', 'speaking-2026', 'Speaking — NFU College Conference on Cooperatives', '2026-09-07', '2026-09-18', 1,
    'Monitor 2027 Minneapolis programming and direct-pitch possibilities.'),
  card('op26-speak-osu', 'speaking-2026', 'Speaking — Oregon State Small Farms Conference 2027', '2026-09-07', '2026-09-18', 1,
    'Monitor 2027 CFP/speaker path; current public pages still center 2026. Keep Portland/Oregon audience relevance in mind.'),
  card('op26-speak-binw', 'speaking-2026', 'Speaking — Business Impact NW Food & Farm programming', '2026-09-07', '2026-09-18', 1,
    'Direct trainer/panel pitch. Their Food & Farm programming includes food-business operations, cooperative structures and regional sourcing; relevant to Oregon/Portland audience development.'),
  card('op26-speak-nofa-ny', 'speaking-2026', 'Speaking — NOFA-NY / New York food-system opportunity', '2026-09-07', '2026-09-18', 1,
    'Reverify current 2027 programming before treating any prior date as current. Preserve as a New York direct-pitch/monitor lane.'),
  card('op26-speak-nyc-direct', 'speaking-2026', 'Speaking — NYC culinary / food-business direct outreach', '2026-09-14', '2026-09-25', 1,
    'Previously selected lane includes culinary education, food-business workshops and food-system panels. Build targeted direct pitches; no invented deadline.'),
  card('op26-speak-nw-food', 'speaking-2026', 'Speaking — Northwest Food Show / Portland programming', '2026-09-14', '2026-09-25', 1,
    'Monitor/direct-pitch opportunity for regional food business; reverify current speaker process.'),
  card('op26-speak-socal-verify', 'speaking-2026', 'Speaking — reverify Moreno Valley / Southern California lead', '2026-09-01', '2026-09-10', 1,
    'A previously preserved “GROW” lead/deadline could not be re-established from current evidence. Re-research before calendaring any hard deadline; do not propagate the old claim as fact.'),

  // Booked private event — no PII in public source
  card('op26-private-aug28-prep', 'private-events-2026', 'Confirmed Aug. 28 private event — final count + logistics', '2026-08-24', '2026-08-26', 3,
    'Retrieve the live customer Gmail/internal record for exact details, menu, guest count, venue/load-in and service needs. Do not copy customer PII into repo source.'),
  eventCard('op26-private-aug28', 'private-events-2026', 'Confirmed private event — internal customer record', '2026-08-28', 3,
    'Booked/confirmed event. Exact customer, venue, pricing and service details live in Gmail/internal systems, not this public seed source.', 'confirmed'),
];

function card(id, project, title, date, dueDate, priority, notes, status = 'todo') {
  return { id, project, objectType: 'prep_task', title, date, dueDate, priority, notes, status };
}

function eventCard(id, project, title, date, priority, notes, status = 'scheduled') {
  return { id, project, objectType: 'event', title, date, dueDate: date, priority, notes, status };
}

function projectFromRow(row) {
  const [slug, title, color, sortOrder, description, targetDate] = row;
  return { slug, title, color, sortOrder, description, targetDate };
}

async function main() {
  if (!UID) throw new Error('HUB_MASTER_SUPABASE_UID or VITE_HUB_MASTER_SUPABASE_UID is required');

  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} Aug-Oct 2026 operator plan for ${UID}`);
  console.log(`Projects: ${projects.length}; cards: ${cards.length}`);
  for (const item of cards) console.log(`- ${item.date} [${item.status}] ${item.title}`);
  if (!APPLY) return;

  const projectIds = new Map();
  for (const raw of projects) {
    const project = projectFromRow(raw);
    const saved = await prisma.plannerProject.upsert({
      where: { supabaseUid_slug: { supabaseUid: UID, slug: project.slug } },
      update: {
        title: project.title,
        color: project.color,
        sortOrder: project.sortOrder,
        description: project.description,
        targetDate: project.targetDate,
      },
      create: { supabaseUid: UID, ...project },
    });
    projectIds.set(project.slug, saved.id);
  }

  for (const item of cards) {
    const existing = await prisma.plannerCard.findUnique({ where: { id: item.id } });
    const status = existing?.status === 'done' ? 'done' : (item.status || existing?.status || 'todo');
    const data = {
      supabaseUid: UID,
      title: item.title,
      date: item.date,
      dayOfWeek: '',
      zone: 'timed',
      objectType: item.objectType,
      people: [],
      revenue: 0,
      notes: item.notes,
      optional: false,
      enabled: true,
      sortOrder: 0,
      status,
      projectId: projectIds.get(item.project) || null,
      priority: item.priority || 0,
      dueDate: item.dueDate || item.date,
    };
    await prisma.plannerCard.upsert({
      where: { id: item.id },
      update: data,
      create: { id: item.id, ...data },
    });
  }

  console.log('Operating plan seeded successfully.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
