/**
 * Google Ads campaign helper for the July Dinner buyout push.
 *
 * Designed for production runtime secrets: Vercel sensitive env vars are
 * available to the serverless function even though `vercel env pull` cannot
 * reveal them locally.
 */

const {
  authorizeGoogleJobRequest,
  getAuthorizedOAuthClient,
  googleApiRequest,
} = require('./googleBusinessAuth');

const CONFIRM_APPLY = 'CREATE_PAUSED_GOOGLE_ADS_CAMPAIGN';
const CAMPAIGN_NAME = 'July Dinner Buyout - Search - Twin Cities';
const AD_GROUP_NAME = 'Private dinner buyout';
const FINAL_URL =
  'https://www.localeffortfood.com/julydinner?booking=buyout&utm_source=google&utm_medium=cpc&utm_campaign=july_dinner_buyout';

const KEYWORDS = [
  { text: 'private chef minneapolis', matchType: 'PHRASE' },
  { text: 'private dinner minneapolis', matchType: 'PHRASE' },
  { text: 'dinner party catering minneapolis', matchType: 'PHRASE' },
  { text: 'private dining twin cities', matchType: 'PHRASE' },
  { text: 'chef dinner party', matchType: 'PHRASE' },
  { text: 'private event dinner minneapolis', matchType: 'PHRASE' },
];

const HEADLINES = [
  'Private Dinner Buyout',
  'Minneapolis Chef Dinner',
  'July 17 At The Arthouse',
  'Whole Night Up To 30',
  'Local Effort Dinner',
  'Book A Private Table',
  'Summer Dinner In July',
  'Twin Cities Private Chef',
];

const DESCRIPTIONS = [
  'Buy out a Local Effort dinner at The Arthouse for up to 30 guests on July 17.',
  'Multi-course summer menu, local farms, one private table in North Minneapolis.',
  'Reserve the whole night online. Beverages can be planned separately.',
  'A private summer dinner from Local Effort Cooperative.',
];

function normalizeCustomerId(value) {
  const id = String(value || '').replace(/\D/g, '');
  if (!/^\d{10}$/.test(id)) throw new Error(`Invalid Google Ads customer ID: ${value || '(missing)'}`);
  return id;
}

function apiConfig() {
  const developerToken = String(process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '').trim();
  if (!developerToken) throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN is required');
  return {
    developerToken,
    loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
      ? normalizeCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID)
      : null,
    version: process.env.GOOGLE_ADS_API_VERSION || 'v24',
  };
}

function requestHeaders(config) {
  return {
    'developer-token': config.developerToken,
    ...(config.loginCustomerId ? { 'login-customer-id': config.loginCustomerId } : {}),
  };
}

function dollarsToMicros(dollars) {
  return Math.round(Number(dollars) * 1_000_000);
}

function positiveBudget(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error('dailyBudget must be a positive number');
  return number;
}

function textAsset(text) {
  return { text };
}

function buildOperations(customerId, dailyBudget) {
  const budget = `customers/${customerId}/campaignBudgets/-1`;
  const campaign = `customers/${customerId}/campaigns/-2`;
  const adGroup = `customers/${customerId}/adGroups/-3`;
  const keywordStart = -100;

  return [
    {
      campaignBudgetOperation: {
        create: {
          resourceName: budget,
          name: `${CAMPAIGN_NAME} Budget ${new Date().toISOString().slice(0, 10)}`,
          amountMicros: dollarsToMicros(dailyBudget),
          deliveryMethod: 'STANDARD',
          explicitlyShared: false,
        },
      },
    },
    {
      campaignOperation: {
        create: {
          resourceName: campaign,
          name: CAMPAIGN_NAME,
          status: 'PAUSED',
          advertisingChannelType: 'SEARCH',
          manualCpc: {},
          campaignBudget: budget,
          networkSettings: {
            targetGoogleSearch: true,
            targetSearchNetwork: false,
            targetContentNetwork: false,
            targetPartnerSearchNetwork: false,
          },
          geoTargetTypeSetting: {
            positiveGeoTargetType: 'PRESENCE',
            negativeGeoTargetType: 'PRESENCE',
          },
          containsEuPoliticalAdvertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING',
        },
      },
    },
    {
      campaignCriterionOperation: {
        create: {
          campaign,
          proximity: {
            geoPoint: {
              latitudeInMicroDegrees: 44977753,
              longitudeInMicroDegrees: -93265011,
            },
            radius: 30,
            radiusUnits: 'MILES',
          },
        },
      },
    },
    {
      adGroupOperation: {
        create: {
          resourceName: adGroup,
          name: AD_GROUP_NAME,
          campaign,
          status: 'ENABLED',
          type: 'SEARCH_STANDARD',
        },
      },
    },
    ...KEYWORDS.map((keyword, index) => ({
      adGroupCriterionOperation: {
        create: {
          resourceName: `customers/${customerId}/adGroupCriteria/-3~${keywordStart - index}`,
          adGroup,
          status: 'ENABLED',
          keyword,
        },
      },
    })),
    {
      adGroupAdOperation: {
        create: {
          adGroup,
          status: 'PAUSED',
          ad: {
            finalUrls: [FINAL_URL],
            responsiveSearchAd: {
              headlines: HEADLINES.map(textAsset),
              descriptions: DESCRIPTIONS.map(textAsset),
              path1: 'julydinner',
              path2: 'buyout',
            },
          },
        },
      },
    },
  ];
}

async function mutateJulyBuyoutCampaign({
  apply = false,
  dailyBudget = 25,
  customerId: customerIdOverride = null,
} = {}) {
  const auth = await getAuthorizedOAuthClient();
  const config = apiConfig();
  const customerId = normalizeCustomerId(customerIdOverride || process.env.GOOGLE_ADS_CUSTOMER_ID);
  const budget = positiveBudget(dailyBudget);
  const operations = buildOperations(customerId, budget);
  const validateOnly = !apply;

  const result = await googleApiRequest(
    auth,
    `https://googleads.googleapis.com/${config.version}/customers/${customerId}/googleAds:mutate`,
    {
      method: 'POST',
      headers: requestHeaders(config),
      body: {
        mutateOperations: operations,
        validateOnly,
        partialFailure: false,
        responseContentType: 'RESOURCE_NAME_ONLY',
      },
    }
  );

  return {
    ok: true,
    mode: validateOnly ? 'validate_only' : 'applied_paused_campaign',
    customerId,
    campaignName: CAMPAIGN_NAME,
    adGroupName: AD_GROUP_NAME,
    dailyBudget,
    finalUrl: FINAL_URL,
    keywordCount: KEYWORDS.length,
    operationCount: operations.length,
    result,
  };
}

function registerGoogleAdsJulyBuyoutRoutes(app, { logger } = {}) {
  app.post('/api/brain/google-ads/july-buyout-campaign', async (req, res) => {
    try {
      if (!await authorizeGoogleJobRequest(req)) {
        return res.status(403).json({ error: 'admin only' });
      }
      const apply = Boolean(req.body?.apply);
      if (apply && req.body?.confirm !== CONFIRM_APPLY) {
        return res.status(400).json({
          error: 'confirmation required',
          confirmRequired: CONFIRM_APPLY,
          note: 'This creates Google Ads resources, though campaign and ad are paused.',
        });
      }
      const result = await mutateJulyBuyoutCampaign({
        apply,
        dailyBudget: req.body?.dailyBudget ?? 25,
        customerId: req.body?.customerId || null,
      });
      logger?.info({
        mode: result.mode,
        campaignName: result.campaignName,
        dailyBudget: result.dailyBudget,
      }, 'brain/google-ads: July buyout campaign mutation complete');
      return res.json(result);
    } catch (error) {
      logger?.error({ err: error }, 'brain/google-ads: July buyout campaign mutation failed');
      return res.status(500).json({
        error: 'google-ads-july-buyout-campaign-failed',
        message: error.message,
      });
    }
  });
}

module.exports = {
  CONFIRM_APPLY,
  buildOperations,
  mutateJulyBuyoutCampaign,
  registerGoogleAdsJulyBuyoutRoutes,
};
