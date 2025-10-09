const DEFAULT_CAMPAIGN_SLUG = process.env.CROWDFUND_SANITY_SLUG
  || 'local-pizza-by-local-effort-let-s-make-1000-pizzas';

let cachedSanityClient = null;

const numberOrNull = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
};

function getDefaultSanityClient() {
  if (cachedSanityClient) {
    return cachedSanityClient;
  }

  const projectId = process.env.SANITY_PROJECT_ID;
  if (!projectId) {
    return null;
  }

  try {
    // eslint-disable-next-line global-require
    const { createClient } = require('@sanity/client');
    const dataset = process.env.SANITY_DATASET || 'localeffort';
    cachedSanityClient = createClient({
      projectId,
      dataset,
      useCdn: false,
      token: process.env.SANITY_API_TOKEN || undefined,
      apiVersion: '2024-01-01',
    });
    return cachedSanityClient;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[crowdfunding.fallback] failed to create Sanity client', error && error.message);
    return null;
  }
}

function extractPublishedCrowdfundingSummary(campaign) {
  if (!campaign || typeof campaign !== 'object') {
    return null;
  }

  const pizzasCandidates = [
    numberOrNull(campaign.pizzasSold),
    numberOrNull(campaign.piesSold),
    numberOrNull(campaign.raisedAmount),
  ].filter((value) => value !== null && value >= 0);

  const pizzas = pizzasCandidates.length > 0 ? pizzasCandidates[0] : null;
  const backers = numberOrNull(campaign.backers);
  const goalCandidates = [
    numberOrNull(campaign.pizzaGoal),
    numberOrNull(campaign.goal),
  ].filter((value) => value !== null && value > 0);
  const goal = goalCandidates.length > 0 ? goalCandidates[0] : null;
  const updatedAt = campaign.updatedAt
    || campaign._updatedAt
    || campaign._createdAt
    || null;

  if (pizzas === null && backers === null && goal === null) {
    return null;
  }

  return {
    pizzas: Number.isFinite(pizzas) ? pizzas : 0,
    backers: Number.isFinite(backers) ? backers : 0,
    goal: Number.isFinite(goal) ? goal : null,
    updatedAt,
    source: 'published',
  };
}

async function loadPublishedCrowdfundingSummary(options = {}) {
  const sanityClient = (() => {
    if (options.sanityClient) {
      if (typeof options.sanityClient === 'function') {
        return options.sanityClient();
      }
      return options.sanityClient;
    }
    return getDefaultSanityClient();
  })();

  if (!sanityClient || typeof sanityClient.fetch !== 'function') {
    return null;
  }

  const slug = options.slug || DEFAULT_CAMPAIGN_SLUG;
  const query = '*[_type == "crowdfundingCampaign" && slug.current == $slug][0]{\n    pizzasSold,\n    piesSold,\n    pizzaGoal,\n    goal,\n    raisedAmount,\n    backers,\n    updatedAt,\n    _updatedAt\n  }';

  try {
    const data = await sanityClient.fetch(query, { slug });
    return extractPublishedCrowdfundingSummary(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[crowdfunding.fallback] failed to fetch published summary', error && error.message);
    return null;
  }
}

module.exports = {
  DEFAULT_CAMPAIGN_SLUG,
  extractPublishedCrowdfundingSummary,
  loadPublishedCrowdfundingSummary,
};
