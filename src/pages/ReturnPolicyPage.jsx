import React from 'react';
import { CONTACT_EMAIL } from '../config/siteMetadata';
import { RETURN_POLICY } from '../config/returnPolicy';
import '../styles/return-policy.css';

const policyDetails = [
  ['Countries covered', RETURN_POLICY.countryName],
  ['Returns', 'Accepted for defective and non-defective products'],
  ['Exchanges', 'Accepted'],
  ['Product condition', 'New only'],
  ['Return window', `${RETURN_POLICY.returnWindowDays} days from delivery`],
  ['Return method', 'By mail'],
  ['Return label', 'Included in the package at no cost'],
  ['Restocking fee', 'None'],
  [
    'Refund processing',
    `Within ${RETURN_POLICY.refundProcessingBusinessDays} business days after receipt and inspection`,
  ],
];

export default function ReturnPolicyPage() {
  return (
    <div className="return-policy-page">
      <article className="return-policy-card">
        <header className="return-policy-header">
          <p className="return-policy-kicker">Local Effort Cooperative</p>
          <h1>Return and exchange policy</h1>
          <p>
            This policy applies to eligible products purchased from Local Effort
            Cooperative and returned from within the United States.
          </p>
          <p className="return-policy-effective">
            Effective {RETURN_POLICY.effectiveDate}
          </p>
        </header>

        <section aria-labelledby="policy-summary">
          <h2 id="policy-summary">Policy summary</h2>
          <dl className="return-policy-summary">
            {policyDetails.map(([term, detail]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="eligibility">
          <h2 id="eligibility">Eligibility</h2>
          <p>
            We accept returns and exchanges of both defective and non-defective
            products. For non-defective returns and exchanges, products must be
            new, unused, unopened, and in their original packaging. Defective or
            damaged products must be returned in the condition in which they
            were received, including the original packaging when available.
          </p>
          <p>
            You must start the return within {RETURN_POLICY.returnWindowDays}{' '}
            calendar days after the product is delivered. Proof of purchase is
            required.
          </p>
        </section>

        <section aria-labelledby="start-return">
          <h2 id="start-return">How to return or exchange a product</h2>
          <ol>
            <li>
              Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{' '}
              within the return window. Include your order number and whether
              you want a refund or exchange. For defective products, include a
              brief description of the issue.
            </li>
            <li>
              Pack the eligible product securely. Use the prepaid return label
              included in the original package.
            </li>
            <li>
              Mail the package using the carrier and return address shown on
              that label.
            </li>
          </ol>
          <p>
            Return shipping is free. We do not charge restocking fees. Please
            contact us before mailing a return so we can identify and process
            it correctly.
          </p>
        </section>

        <section aria-labelledby="refunds">
          <h2 id="refunds">Refunds and exchanges</h2>
          <p>
            After we receive and inspect an eligible return, we will issue an
            approved refund to the original payment method within{' '}
            {RETURN_POLICY.refundProcessingBusinessDays} business days. Your
            financial institution may require additional time to post the
            credit.
          </p>
          <p>
            Approved exchanges are subject to product availability. If the
            requested replacement is unavailable, we will issue a refund to the
            original payment method.
          </p>
        </section>

        <section aria-labelledby="contact">
          <h2 id="contact">Questions</h2>
          <p>
            Contact Local Effort Cooperative at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </section>
      </article>

    </div>
  );
}
