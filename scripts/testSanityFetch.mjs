import dotenv from 'dotenv';
import { createClient } from '@sanity/client';

dotenv.config({ path: new URL('../.env', import.meta.url) });
const projectId = process.env.VITE_APP_SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID;
const dataset = process.env.VITE_APP_SANITY_DATASET || process.env.VITE_SANITY_DATASET;
if (!projectId || !dataset) {
  console.error('Missing SANITY env vars', { projectId, dataset });
  process.exit(2);
}

const client = createClient({ projectId, dataset, useCdn: true, apiVersion: '2023-05-03' });

const slug = 'local-pizza-by-local-effort-let-s-make-1000-pizzas';
const query = `*[_type == "crowdfundingCampaign" && slug.current == $slug][0]{
  title,
  description,
  pizzaGoal,
  pizzasSold,
  goal,
  raisedAmount,
  backers,
  endDate,
  heroImage,
  story,
  faq,
  "rewardTiers": rewardTiers[]->{ amount, pizzaCount, title, description, limit } | order(amount asc),
  "updates": updates[]->{ title, publishedAt, body } | order(publishedAt desc)
}`;

(async () => {
  try {
    const data = await client.fetch(query, { slug });
    console.log('FETCH OK:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('FETCH ERR:', err && err.message ? err.message : err);
    if (err && err.response) {
      try { console.error('response body:', await err.response.text()); } catch (e) {}
    }
    process.exit(1);
  }
})();
