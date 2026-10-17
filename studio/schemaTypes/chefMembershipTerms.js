import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'chefMembershipTerms',
  title: 'Chef membership terms',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Agreement title', type: 'string', validation: (r) => r.required().max(160) }),
    defineField({ name: 'version', title: 'Agreement version', type: 'string', description: 'A new version is required when binding terms change. Publishing is not adoption; the owner separately adopts the exact revision in the chef workspace.', validation: (r) => r.required().max(80) }),
    defineField({ name: 'agreementText', title: 'Complete membership agreement', type: 'text', rows: 24, description: 'Counsel-reviewed final terms, not the public proposal. Include membership class, admission authority, rights, obligations, withdrawal, and dispute process. Do not put tax forms or personal information here.', validation: (r) => r.required().min(100).max(40000) }),
    defineField({ name: 'acceptanceText', title: 'Acceptance statement', type: 'text', rows: 3, description: 'The exact statement the applicant affirms before signing. State whether and how dues become due; this workflow does not authorize automatic charges.', validation: (r) => r.required().max(2000) }),
    defineField({ name: 'onboardingInstructions', title: 'Onboarding instructions', type: 'text', rows: 8, description: 'Explain the orientation and secure provider process, what happens next, and how to contact Local Effort. Never ask for an SSN or completed W-9 in this app or by email.', validation: (r) => r.required().max(5000) }),
    defineField({ name: 'secureOnboardingUrl', title: 'Secure onboarding provider URL', type: 'url', description: 'Optional approved provider landing page. Do not paste a personal invitation, bearer token, or link containing applicant data.', validation: (r) => r.uri({ scheme: ['https'] }) }),
    defineField({ name: 'approvalReference', title: 'Adoption authority / approval reference', type: 'string', description: 'Identify the actual board/owner decision or counsel-approved authority. Publication alone does not make a proposed policy adopted.', validation: (r) => r.required().max(500) }),
    defineField({ name: 'replyEmail', title: 'Membership reply contact', type: 'string', validation: (r) => r.required().email() }),
    defineField({ name: 'operationsEnabled', title: 'Enable private work and contribution workflows in this agreement', type: 'boolean', initialValue: false, description: 'Enable only after the agreement adopts eligibility, allocation, independent contribution review and accounting authority. This does not grant work, equity or payouts.' }),
    defineField({ name: 'publicationEnabled', title: 'Permit separately consented, moderated directory listings', type: 'boolean', initialValue: false }),
    defineField({ name: 'publicationConsentText', title: 'Exact separate directory consent statement', type: 'text', rows: 5, description: 'Describe the public display name, service area, biography, services and photo URL, moderation, withdrawal and the limits of recalling third-party copies. No email, phone, tax information or private application details are published.', validation: (r) => r.custom((value, context) => context.document?.publicationEnabled && !value?.trim() ? 'Required before directory consent can be offered' : true) }),
    defineField({ name: 'dues', title: 'Adopted operating dues — leave unset until approved', type: 'object', description: 'Not the public price recommendation. This complete object is snapshotted into the signed agreement; publishing alone neither adopts a policy nor charges anyone.', fields: [
      defineField({ name: 'amountCents', title: 'Monthly dues (integer USD cents)', type: 'number', validation: (r) => r.required().integer().min(1).max(2147483647) }),
      defineField({ name: 'currency', title: 'Currency', type: 'string', options: { list: ['USD'] }, validation: (r) => r.required().valid('USD') }),
      ...[['billingText', 'Billing and period terms'], ['refundText', 'Refund terms'], ['cancellationText', 'Cancellation terms'], ['waiverText', 'Reduction and waiver terms']].map(([name, title]) => defineField({ name, title, type: 'text', rows: 5, validation: (r) => r.required().max(8000) })),
    ] }),
  ],
  preview: { select: { title: 'title', subtitle: 'version' } },
});
