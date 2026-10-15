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
  title: 'Independent kitchens.\nA shared effort.',
  metaTitle: 'For Independent Chefs | Local Effort Cooperative',
  metaDescription: 'Explore Local Effort’s proposed chef cooperative and start a no-fee application. Independent chef collaboration, not employment hiring or consumer Localist membership.',
  introduction: rich('For chefs building an independent practice—and working chefs thinking about taking that step. We are developing a cooperative path to share opportunities, preparation work, knowledge and the work of building something together.'),
  proposalNotice: rich('This is a proposal, not adopted membership terms. The benefits, dues and ownership approach below remain recommendations for owner, member and professional review. Applying does not admit you as a member or accept a final agreement.'),
  independenceNotice: rich('This is a path for independent chefs, not an employment vacancy. Each paid engagement would need its own agreed scope, compensation and responsibilities. Calling a relationship independent does not settle worker classification; legal and tax review must come before the relevant work arrangement.'),
  localistDistinction: rich('Looking for meals rather than a place to build your chef practice? Localist is our separate customer membership. A chef application does not enroll you in Localist or purchase a customer subscription.'),
  signupFeeNotice: 'No fees due at signup. No card or payment details requested.',
  dues: {
    heading: 'A shared operating budget, not a share purchase.',
    recommendedMonthlyAmountCents: 5000,
    amountLabel: 'per month · proposed operating dues',
    proposalLabel: 'Recommendation only — not adopted',
    rationale: rich('We recommend modeling $50 in monthly operating dues to support coordination, shared software, education and promotion, with an operating reserve. This is a planning recommendation, not an approved budget or proof that these services are already funded.', 'Operating dues would support cooperative services. They would not buy a percentage of the company, become an individual savings balance, or replace payment for your work. Kitchen costs, job compensation and any exchanges would be agreed separately.'),
    collectionNotice: rich('There is nothing to pay to apply. No dues will be collected through this signup, while terms remain proposed, or before approved admission and your explicit acceptance of final agreements. Applying does not start billing or authorize a later automatic charge.'),
    undecidedHeading: 'Before anyone pays',
    undecidedTerms: [
      'Approve the dues amount, service budget, spending oversight and reserves.',
      'Set billing timing, cancellation and refund terms, and a funded hardship-waiver policy.',
      'Confirm admission criteria, governance rights and the agreements each member would accept.',
    ],
  },
  benefitsHeading: 'What we are working toward',
  benefits: [
    entry('referrals', 'A first look at suitable opportunities', 'The proposal gives eligible, available chef members preferred consideration for suitable referrals and jobs that reach Local Effort. Client choice, fit and food-safety requirements still matter. The allocation process must be agreed and transparent; this is not a guarantee of clients, jobs, hours or earnings.'),
    entry('prep', 'A pool of available prep work', 'Available preparation hours would be offered to suitable members first, with scope and pay agreed for each engagement. A shared pool is a way to distribute work that exists—not a promise that any minimum number of hours will exist.'),
    entry('kitchen', 'Kitchen time, worked out together', 'Members could seek and negotiate kitchen hours individually around availability, facilities, needs and contributions. Joining would not automatically allot kitchen time or include free use. Any prep-for-kitchen exchange would need separate written terms, fair valuation and appropriate review.'),
    entry('promotion', 'A public presence, if you want one', 'Optional promotion could include a chef biography, photographs and services on the website or in shared spaces. Public listings would require separate consent and moderation. An application or private work profile would never become a public listing automatically.'),
    entry('ownership', 'A possible path to ownership', 'The proposed model makes qualifying participation a basis for ownership review, subject to adopted governance, eligibility rules and the cooperative’s actual finances. Dues or hours alone do not issue equity. The ownership approach below is a design direction, not an entitlement.'),
  ],
  equity: {
    heading: 'Build a practice. Help shape the cooperative.',
    body: rich('Our recommended direction is a contribution-based ownership path with individual capital accounts and democratic membership rights, subject to legal and accounting review and reconciliation with the cooperative’s existing ownership structure.', 'Admission, operating dues, paid work, contributed capital and any allocation of actual cooperative surplus are different things. No fixed company percentage is promised for an hour worked or a dues payment. Any future patronage allocation would depend on verified qualifying contributions, actual allocable surplus and the approvals required by adopted governing documents.', 'This page does not offer an investment, a capital instrument, an equity grant or a guaranteed return. Applying does not change the cap table or give voting, ownership or general staff access.'),
    unresolvedHeading: 'Still to be agreed',
    unresolvedTerms: [
      'Membership classes, admission authority, voting rights and appeal process.',
      'Qualifying contributions, eligibility thresholds and treatment of paid or waived dues.',
      'Capital-account rules, surplus allocation, vesting, losses and exit or redemption terms.',
      'Legal, tax and worker-classification review before final agreements or paid engagements.',
    ],
  },
  application: {
    heading: 'Start with a conversation about your work.',
    body: rich('Use the chef workspace in the Hub to tell us about your experience, the work you want to do, your area and availability. Applying is free. It starts a private review process—not a job offer, automatic membership or a promise of work.'),
    ctaLabel: 'Start a chef application',
    nextSteps: [
      entry('apply', 'Sign in and share the essentials', 'Create or use your Hub sign-in, then share enough about your chef practice and interests for a fit conversation. Do not put Social Security numbers, bank details or tax documents in your application.'),
      entry('review', 'Talk through fit and questions', 'Local Effort reviews the application and may discuss experience, services and what collaboration could look like. An interest or fit decision is not legal admission, an assignment of work or an ownership grant.'),
      entry('agree', 'Agree before any commitment', 'Any future membership, kitchen use or paid engagement requires its own approved terms and explicit agreement. Final admission and work access are separate steps. There is no payment, automatic enrollment or external payroll invitation in this application.'),
    ],
  },
  privacy: {
    heading: 'Your application is not your public biography.',
    body: rich('Application and work-preference information stays in the private applicant workspace for authorized review. Optional public biography, photographs and services are a separate opt-in draft and require moderation before publication. You can discuss publication or removal with us before anything goes live.', 'Do not submit a W-9, SSN, EIN, bank account or sensitive tax information in signup fields, a biography or ordinary email. If a later approved engagement needs tax onboarding, it must use a separately approved secure provider workflow—not this signup.'),
  },
  contact: {
    heading: 'Questions before you apply?',
    body: rich('Ask about the proposed model, accessibility, your application or how your information is used. We would rather clarify a term than have you join on an assumption. The proposal remains open for review; final rights and obligations belong in approved agreements, not in a website promise.'),
    email: 'yum@localeffortfood.com',
    label: 'Write to Local Effort',
  },
};
