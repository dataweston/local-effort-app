#!/usr/bin/env node
/* Projects founder-reviewed public partner graph fields into matching Cloudinary assets. Dry-run unless --apply. */
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const { getPrisma } = require('../backend/api/utils/prisma');

const apply = process.argv.includes('--apply');
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });

function norm(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

async function run() {
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) throw new Error('Cloudinary credentials missing');
  const prisma = getPrisma();
  const partners = (await prisma.brainEntity.findMany({ where: { entityType: { in: ['Vendor', 'Supplier'] }, visibility: 'public', tombstonedAt: null }, include: { aliases: true } }))
    .filter(p => p.properties?.publicEligible === true);
  let cursor; let matched = 0;
  do {
    const search = cloudinary.search.expression('resource_type:image').with_field('context').max_results(500);
    if (cursor) search.next_cursor(cursor);
    const result = await search.execute();
    for (const asset of result.resources || []) {
      const ctx = asset.context?.custom || asset.context || {};
      const haystack = norm([asset.public_id, ...Object.values(ctx)].join(' '));
      const partner = partners.find(p => [p.name, ...p.aliases.map(a => a.alias)].some(name => haystack.includes(norm(name))));
      if (!partner) continue;
      matched++;
      const metadata = {
        ...ctx, vendorEntityId: partner.id, vendorName: partner.name,
        relationshipType: partner.properties.partnerRelationshipType || 'partner',
        vendorWebsite: partner.properties.website || '', vendorInstagram: partner.properties.instagram || '',
        physicalAddress: partner.properties.physicalAddress || '',
        whatWeBuy: (partner.properties.whatWeBuy || []).join(', '),
      };
      if (apply) await cloudinary.uploader.explicit(asset.public_id, { type: asset.type || 'upload', resource_type: asset.resource_type || 'image', context: metadata });
      console.log(`${apply ? 'updated' : 'would update'} ${asset.public_id} -> ${partner.name}`);
    }
    cursor = result.next_cursor;
  } while (cursor);
  console.log(JSON.stringify({ apply, partners: partners.length, matched }));
  await prisma.$disconnect();
}
run().catch(err => { console.error(err.message); process.exitCode = 1; });
