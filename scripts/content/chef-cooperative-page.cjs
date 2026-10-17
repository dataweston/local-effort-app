// Owner-reviewable PUBLIC proposal copy. This is seed input, not a CMS snapshot.
// No private applicant records, payment configuration or membership grants belong here.
const rich = (...paragraphs) => paragraphs.map((text, index) => ({
  _type: 'block', _key: `p${index}`, style: 'normal', markDefs: [],
  children: [{ _type: 'span', _key: `s${index}`, text, marks: [] }],
}));
const entry = (key, heading, ...body) => ({ _key: key, heading, body: rich(...body) });

module.exports = {
  _id: 'chef-cooperative-page',
  _type: 'chefCooperativePage',
  title: 'Your own chef practice.\nA shared future in St. Paul.',
  metaTitle: 'Independent Chefs in St. Paul | Local Effort Cooperative',
  metaDescription: 'Build your independent chef practice in St. Paul. Explore Local Effort’s developing cooperative, shared opportunities and proposed ownership path. Apply free.',
  introduction: rich('Keep your independence. Build something together. Local Effort is developing a cooperative for St. Paul chefs to share work opportunities, resources and a path toward collective ownership—including chefs ready to start an independent practice.'),
  proposalNotice: rich('This model is proposed, not adopted. Benefits, dues and ownership need owner, member and professional review. An application is not admission or acceptance of a membership agreement.'),
  independenceNotice: rich('This is an independent chef pathway, not a job vacancy. Each paid engagement needs agreed scope, pay and responsibilities. Membership does not determine worker classification; legal and tax review must precede the work arrangement.'),
  localistDistinction: rich('Looking for meals? Localist is our separate customer membership. Applying as a chef does not enroll you in Localist or buy a meal subscription.'),
  signupFeeNotice: 'Free to apply. No card or payment details requested.',
  dues: {
    heading: 'Share the running costs.',
    recommendedMonthlyAmountCents: 5000,
    amountLabel: 'per month · proposed operating dues',
    proposalLabel: 'Proposed, not adopted',
    rationale: rich('The $50 monthly recommendation would support coordination, shared software, education, promotion and a reserve. The budget is not approved and these services are not yet funded by it.', 'Dues would pay for shared operations—not buy shares, build personal savings or pay for your work. Kitchen costs, job pay and exchanges need separate agreements.'),
    collectionNotice: rich('Applying costs nothing and authorizes no later charge. No dues are collected through signup, while terms are proposed, or before approved admission and your explicit agreement to final terms.'),
    undecidedHeading: 'Before dues can begin',
    undecidedTerms: [
      'Approve the amount, budget, spending oversight and reserves.',
      'Set billing, cancellation, refunds and a funded hardship-waiver policy.',
      'Confirm admission rules, governance rights and member agreements.',
    ],
  },
  benefitsHeading: 'More ways to work. People to build with.',
  benefits: [
    entry('referrals', 'First consideration for suitable work', 'Members would get preferred consideration for referrals and jobs reaching Local Effort. Allocation rules must be transparent, with client choice, fit and food safety respected. No clients, jobs or earnings are guaranteed.'),
    entry('prep', 'Share the available prep work', 'Suitable members would be offered available prep hours first, with scope and pay agreed for each engagement. There is no guaranteed minimum of hours.'),
    entry('kitchen', 'Negotiate the kitchen time you need', 'Kitchen hours would be negotiated around availability, needs and contributions—not automatically allotted or free. Any prep-for-kitchen exchange needs written terms, fair valuation and appropriate review.'),
    entry('promotion', 'Let people find your work', 'An optional public biography, photos and services could help introduce your practice on our website or in shared spaces. Listings need separate consent and review; applications never become public automatically.'),
    entry('ownership', 'Work toward a shared stake', 'Qualifying contributions could open a path to ownership under approved rules and the cooperative’s finances. Hours or dues alone do not grant equity.'),
  ],
  equity: {
    heading: 'Your practice. A stake in what we build.',
    body: rich('The idea is to build shared resources and give participating chefs a voice in the cooperative they help sustain. We propose a contribution-based path toward collective ownership, with individual capital accounts and democratic member rights—not ownership on application.', 'Eligibility, qualifying contributions and rights still need approval, legal and accounting review, and alignment with existing ownership. Dues, paid work, contributed capital and ownership are distinct. Any surplus allocation would depend on verified contributions, actual available surplus and the approvals required by governing documents.', 'No fixed stake or return is promised. This is not an investment offer or equity grant; applying gives no ownership, voting rights or general staff access.'),
    unresolvedHeading: 'What members would need to agree',
    unresolvedTerms: [
      'Member classes, admission authority, voting rights and appeals.',
      'Qualifying contributions, eligibility thresholds and paid or waived dues.',
      'Capital accounts, surplus allocation, vesting, losses and exit or redemption.',
      'Legal, tax and worker-classification review before agreements or paid work.',
    ],
  },
  application: {
    heading: 'Tell us what you want to cook.',
    body: rich('Already working independently, or ready to start? Sign in to the chef Hub to tell us about your experience, interests, area and availability. It starts a private review—not a commitment.'),
    ctaLabel: 'Start your chef application',
    nextSteps: [
      entry('apply', 'Sign in and introduce yourself', 'Create or use your Hub sign-in, then tell us about your work and interests. Leave out tax documents, tax IDs and bank details.'),
      entry('review', 'Talk about the fit', 'Local Effort privately reviews your application and may follow up about your services and possible collaboration. Review is not a job offer, work assignment, admission or ownership grant.'),
      entry('agree', 'Decide with the terms in front of you', 'Membership, kitchen use and paid work each need approved terms and your agreement. Admission and work access are separate steps; applying triggers no payment, automatic enrollment or payroll invitation.'),
    ],
  },
  privacy: {
    heading: 'Your application stays private.',
    body: rich('Application and work preferences stay in the applicant workspace for authorized review. A public biography, photos or services are a separate opt-in draft, reviewed before publication. Talk with us about publication or removal.', 'Keep W-9s, SSNs, EINs, bank details and sensitive tax information out of applications, biographies and ordinary email. Any later tax onboarding must use a separately approved secure provider workflow.'),
  },
  contact: {
    heading: 'Questions before you apply?',
    body: rich('Ask about the cooperative, accessibility, your application or privacy. You do not need all the answers before saying hello. Final rights and responsibilities will be set in approved agreements.'),
    email: 'yum@localeffortfood.com',
    label: 'Write to Local Effort',
  },
};
