import { SITE_URL } from './siteMetadata';

export const RETURN_POLICY = {
  applicableCountry: 'US',
  countryName: 'United States',
  returnWindowDays: 5,
  refundProcessingBusinessDays: 5,
  effectiveDate: 'July 4, 2026',
  policyUrl: `${SITE_URL}/return-policy`,
};

export const MERCHANT_RETURN_POLICY_JSON_LD = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: RETURN_POLICY.applicableCountry,
  returnPolicyCountry: RETURN_POLICY.applicableCountry,
  merchantReturnLink: RETURN_POLICY.policyUrl,
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: RETURN_POLICY.returnWindowDays,
  itemCondition: 'https://schema.org/NewCondition',
  returnMethod: 'https://schema.org/ReturnByMail',
  returnFees: 'https://schema.org/FreeReturn',
  returnLabelSource: 'https://schema.org/ReturnLabelInBox',
  customerRemorseReturnFees: 'https://schema.org/FreeReturn',
  customerRemorseReturnLabelSource: 'https://schema.org/ReturnLabelInBox',
  itemDefectReturnFees: 'https://schema.org/FreeReturn',
  itemDefectReturnLabelSource: 'https://schema.org/ReturnLabelInBox',
  refundType: [
    'https://schema.org/FullRefund',
    'https://schema.org/ExchangeRefund',
  ],
  restockingFee: {
    '@type': 'MonetaryAmount',
    value: 0,
    currency: 'USD',
  },
};
