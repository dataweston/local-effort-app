const { PrismaClient } = require('@prisma/client');
const { verifySupabaseToken } = require('./_auth');

let prisma = null;
try { prisma = new PrismaClient(); } catch (_) { prisma = null; }

module.exports = async (req, res) => {
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const supabaseUser = await verifySupabaseToken(req);
  if (!supabaseUser) return res.status(401).json({ error: 'Unauthorized' });

  // Try resolving customer by slug first, then fall back to email lookup
  const slug = req.query?.customerSlug;
  let customer = null;

  if (slug) {
    customer = await prisma.customer.findFirst({ where: { slug } });
  }
  if (!customer) {
    const user = await prisma.user.findFirst({
      where: { email: supabaseUser.email },
      include: { customer: true },
    });
    customer = user?.customer || null;
  }
  if (!customer) return res.status(404).json({ error: 'No customer profile found' });

  const customerId = customer.id;

  if (req.method === 'GET') {
    const profile = await prisma.customerProfile.findUnique({ where: { customerId } });
    const users = await prisma.user.findMany({
      where: { customerId },
      select: { id: true, email: true, role: true },
    });
    return res.status(200).json({
      customer: {
        id: customer.id,
        slug: customer.slug,
        name: customer.name,
      },
      profile: profile || {},
      users,
    });
  }

  if (req.method === 'PUT') {
    const { name, householdSize, phone, address, deliveryNotes, intakeSurvey } = req.body || {};
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
        ...(intakeSurvey !== undefined && { intakeSurvey }),
      },
      create: {
        customerId,
        householdSize: householdSize || null,
        phone: phone || null,
        address: address || null,
        deliveryNotes: deliveryNotes || null,
        intakeSurvey: intakeSurvey || null,
      },
    });
    return res.status(200).json({ profile });
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
};
