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
const CAMPAIGN_NAME_PREFIX = 'July Dinner Buyout - Search - Twin Cities';
const AD_GROUP_NAME = 'Private dinner buyout';
const CONVERSION_ACTION_NAME = 'July Dinner Buyout Purchase';
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

// Google Ads demographic buckets are coarse. This maps the requested 25-50
// target to the closest available age range, and "top 25%" income to the
// stricter top-20% household-income buckets.
const AGE_RANGES = [
  'AGE_RANGE_25_34',
  'AGE_RANGE_35_44',
  'AGE_RANGE_45_54',
];

const HOUSEHOLD_INCOME_RANGES = [
  'INCOME_RANGE_80_90',
  'INCOME_RANGE_90_UP',
];

const FEMALE_BID_MODIFIER = 1.25;

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

function requestHeaders(config, includeLoginCustomer = true) {
  return {
    'developer-token': config.developerToken,
    ...(includeLoginCustomer && config.loginCustomerId ? { 'login-customer-id': config.loginCustomerId } : {}),
  };
}

async function listAccessibleCustomers() {
  const auth = await getAuthorizedOAuthClient();
  const config = apiConfig();
  const body = await googleApiRequest(
    auth,
    `https://googleads.googleapis.com/${config.version}/customers:listAccessibleCustomers`,
    { headers: requestHeaders(config) }
  );
  return {
    ok: true,
    loginCustomerId: config.loginCustomerId,
    resourceNames: body.resourceNames || [],
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

function campaignName() {
  return `${CAMPAIGN_NAME_PREFIX} - ${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
}

function buildOperations(customerId, dailyBudget, name = campaignName()) {
  const conversionAction = `customers/${customerId}/conversionActions/-4`;
  const budget = `customers/${customerId}/campaignBudgets/-1`;
  const campaign = `customers/${customerId}/campaigns/-2`;
  const adGroup = `customers/${customerId}/adGroups/-3`;
  const keywordStart = -100;

  return [
    {
      conversionActionOperation: {
        create: {
          resourceName: conversionAction,
          name: CONVERSION_ACTION_NAME,
          type: 'WEBPAGE',
          category: 'PURCHASE',
          status: 'ENABLED',
          primaryForGoal: true,
          valueSettings: {
            defaultValue: 2550,
            defaultCurrencyCode: 'USD',
            alwaysUseDefaultValue: false,
          },
        },
      },
    },
    {
      campaignBudgetOperation: {
        create: {
          resourceName: budget,
          name: `${name} Budget`,
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
          name,
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
    ...AGE_RANGES.map((type) => ({
      adGroupCriterionOperation: {
        create: {
          adGroup,
          status: 'ENABLED',
          ageRange: { type },
        },
      },
    })),
    ...HOUSEHOLD_INCOME_RANGES.map((type) => ({
      adGroupCriterionOperation: {
        create: {
          adGroup,
          status: 'ENABLED',
          incomeRange: { type },
        },
      },
    })),
    {
      adGroupCriterionOperation: {
        create: {
          adGroup,
          status: 'ENABLED',
          bidModifier: FEMALE_BID_MODIFIER,
          gender: { type: 'FEMALE' },
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

async function mutate(auth, config, customerId, operations, validateOnly, includeLoginCustomer) {
  return googleApiRequest(
    auth,
    `https://googleads.googleapis.com/${config.version}/customers/${customerId}/googleAds:mutate`,
    {
      method: 'POST',
      headers: requestHeaders(config, includeLoginCustomer),
      body: {
        mutateOperations: operations,
        validateOnly,
        partialFailure: false,
        responseContentType: 'RESOURCE_NAME_ONLY',
      },
    }
  );
}

function shouldRetryDirect(error, config) {
  return Boolean(config.loginCustomerId)
    && (String(error?.message || '').includes('USER_PERMISSION_DENIED')
      || String(error?.message || '').includes('login-customer-id'));
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
  const name = campaignName();
  const operations = buildOperations(customerId, budget, name);
  const validateOnly = !apply;

  let accessPath = config.loginCustomerId ? `manager:${config.loginCustomerId}` : 'direct';
  let result;
  try {
    result = await mutate(auth, config, customerId, operations, validateOnly, true);
  } catch (error) {
    if (!shouldRetryDirect(error, config)) throw error;
    result = await mutate(auth, config, customerId, operations, validateOnly, false);
    accessPath = 'direct';
  }

  return {
    ok: true,
    mode: validateOnly ? 'validate_only' : 'applied_paused_campaign',
    accessPath,
    customerId,
    campaignName: name,
    adGroupName: AD_GROUP_NAME,
    conversionActionName: CONVERSION_ACTION_NAME,
    dailyBudget,
    finalUrl: FINAL_URL,
    targeting: {
      ageRanges: AGE_RANGES,
      householdIncomeRanges: HOUSEHOLD_INCOME_RANGES,
      genderBidModifiers: { FEMALE: FEMALE_BID_MODIFIER },
    },
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
  listAccessibleCustomers,
  mutateJulyBuyoutCampaign,
  registerGoogleAdsJulyBuyoutRoutes,
};
