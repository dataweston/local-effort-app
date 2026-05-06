#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const sanity = require('@sanity/client');

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local'), override: false });
dotenv.config({ path: path.resolve(process.cwd(), '.env.vercel.production'), override: false });

const OUTPUT_FILE = path.resolve(process.cwd(), 'src/store/data/generatedReleasesPageData.json');

const FALLBACK_DATA = {
  generatedAt: new Date().toISOString(),
  releases: [],
};

const RELEASES_QUERY = `*[_type == "release"] | order(coalesce(publishedAt, _createdAt) desc)[0...50]{
  _id,
  title,
  "slug": slug.current,
  summary,
  publishedAt,
  body,
  canonicalUrl,
  metaDescription,
  isArchived,
  mediaContact{ name, organization, email, website, location, instagram, tiktok },
  campaignHighlights,
  pressFacts[]{ label, value },
  leadership[]{ name, title, bio },
  pressAssets[]{ label, value, href },
  pressKitUrl,
  storyAngles,
  heroImage{ alt, "url": asset->url }
}`;

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function fetchReleasesPageData() {
  const projectId =
    process.env.VITE_APP_SANITY_PROJECT_ID ||
    process.env.VITE_SANITY_PROJECT_ID ||
    process.env.SANITY_PROJECT_ID;
  const dataset =
    process.env.VITE_APP_SANITY_DATASET ||
    process.env.VITE_SANITY_DATASET ||
    process.env.SANITY_DATASET;

  if (!projectId || !dataset) {
    process.stderr.write('[releases-data] Missing Sanity environment variables. Writing fallback data.\n');
    return FALLBACK_DATA;
  }

  const client = sanity.createClient({
    projectId,
    dataset,
    useCdn: true,
    apiVersion: '2023-05-03',
  });

  const releases = await client.fetch(RELEASES_QUERY);

  return {
    generatedAt: new Date().toISOString(),
    releases: Array.isArray(releases) ? releases : [],
  };
}

async function main() {
  const data = await fetchReleasesPageData().catch((error) => {
    process.stderr.write(`[releases-data] Failed to fetch Sanity data. Writing fallback data. ${error?.message || error}\n`);
    return FALLBACK_DATA;
  });

  ensureDirectory(OUTPUT_FILE);
  fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  process.stdout.write(`[releases-data] Wrote ${data.releases.length} releases to ${OUTPUT_FILE}\n`);
}

main().catch((error) => {
  process.stderr.write(`[releases-data] Unexpected error ${error?.message || error}\n`);
  process.exit(1);
});
