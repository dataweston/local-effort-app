/**
 * Hub customer profile — the Hub-native replacement for the old Subscriber
 * Portal "Profile" tab (/api/weekly-order/profile). A customer reads and edits
 * their own household info, delivery notes, and sees their plan + intake survey.
 *
 * Strictly self-scoped: the customer is resolved from the auth token via
 * resolveHubViewer, which forbids loading another customer's row. Staff/privileged
 * may target a specific customer with ?customerSlug= (admin override only).
 *
 *   GET  /api/hub/customer-profile            → { ok, customer, profile, plan, users }
 *   PUT  /api/hub/customer-profile            → { ok, profile }
 *       body: { name?, householdSize?, phone?, address?, deliveryNotes? }
 */

const { prisma } = require('../_lib/prisma');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, cleanString } = require('./_http');


// Summarize planRulesJson (both the richer `sections` shape and the legacy
// count-only `sectionRules`) into a flat, customer-friendly list.
function summarizePlan(planRulesJson) {
  if (!planRulesJson || typeof planRulesJson !== 'object') return null;
  const out = { household: planRulesJson.household || null, billing: planRulesJson.billing || null, items: [] };
  if (planRulesJson.sections && typeof planRulesJson.sections === 'object') {
    for (const [key, s] of Object.entries(planRulesJson.sections)) {
      out.items.push({
        key,
        label: s.label || key,
        qty: s.open ? null : (s.qty ?? null),
        open: !!s.open,
        serves: s.servesAdults != null || s.servesKids != null
          ? { adults: s.servesAdults ?? 0, kids: s.servesKids ?? 0 }
          : null,
        style: s.style || null,
      });
    }
  } else if (planRulesJson.sectionRules && typeof planRulesJson.sectionRules === 'object') {
    for (const [key, r] of Object.entries(planRulesJson.sectionRules)) {
      const qty = r.min === r.max ? r.min : null;
      out.items.push({ key, label: r.label || key, qty, range: r.min === r.max ? null : { min: r.min, max: r.max }, open: false, serves: null, style: null });
    }
  }
  return out.items.length ? out : null;
}

async function handler(req, res) {
  if (!['GET', 'PUT'].includes(req.method)) return methodNotAllowed(res, ['GET', 'PUT']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  // requireCustomer: every caller here must resolve to a customer (their own).
  const auth = await resolveHubViewer(req, prisma, { requireCustomer: true });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  // Customers, staff, and privileged may use this; the row is auth-scoped above.
  const denied = requireHubAccess(auth, { allowedAccess: ['customer', 'staff', 'privileged'] });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const customerId = auth.customer.id;

  try {
    if (req.method === 'GET') {
      const [profile, users, customer] = await Promise.all([
        prisma.customerProfile.findUnique({ where: { customerId } }),
        prisma.user.findMany({ where: { customerId }, select: { id: true, email: true, role: true } }),
        prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, slug: true, name: true, planRulesJson: true } }),
      ]);
      return res.status(200).json({
        ok: true,
        customer: { id: customer.id, slug: customer.slug, name: customer.name },
        profile: profile || {},
        plan: summarizePlan(customer.planRulesJson),
        intakeSurvey: profile?.intakeSurvey || null,
        users,
      });
    }

    // PUT — update the customer's own profile fields only.
    const body = req.body || {};
    const name = body.name !== undefined ? cleanString(body.name, 200) : undefined;
    const householdSize = body.householdSize !== undefined ? cleanString(body.householdSize, 120) : undefined;
    const phone = body.phone !== undefined ? cleanString(body.phone, 40) : undefined;
    const address = body.address !== undefined ? cleanString(body.address, 400) : undefined;
    const deliveryNotes = body.deliveryNotes !== undefined ? cleanString(body.deliveryNotes, 2000) : undefined;

    if (name !== undefined) {
      await prisma.customer.update({ where: { id: customerId }, data: { name } });
    }
    const profile = await prisma.customerProfile.upsert({
      where: { customerId },
      update: {
        ...(householdSize !== undefined && { householdSize }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(deliveryNotes !== undefined && { deliveryNotes }),
      },
      create: {
        customerId,
        householdSize: householdSize || null,
        phone: phone || null,
        address: address || null,
        deliveryNotes: deliveryNotes || null,
      },
    });
    return res.status(200).json({ ok: true, profile });
  } catch (err) {
    console.error('[hub/customer-profile] error', err);
    return res.status(500).json({ error: 'Unable to load or save profile' });
  }
}

module.exports = handler;
module.exports._internals = { summarizePlan };
