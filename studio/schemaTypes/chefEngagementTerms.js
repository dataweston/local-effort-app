import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'chefEngagementTerms',
  title: 'Chef work / kitchen agreement templates',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Agreement title', type: 'string', validation: (r) => r.required().max(160) }),
    defineField({ name: 'version', title: 'Binding template version', type: 'string', description: 'Use a new version when binding terms change. Individual offers preserve the exact published revision and private negotiated facts. Publishing does not authorize work or book kitchen time.', validation: (r) => r.required().max(80) }),
    defineField({ name: 'kind', title: 'Agreement kind', type: 'string', options: { list: [{ title: 'Work engagement', value: 'work' }, { title: 'Kitchen use', value: 'kitchen' }] }, validation: (r) => r.required() }),
    defineField({ name: 'agreementText', title: 'Complete counsel-reviewed agreement', type: 'text', rows: 24, description: 'Final rights, obligations, classification, compensation, safety, cancellation, disputes and electronic assent/retention terms. Do not enter personal, tax, bank or W-9 data. Individual scope, dates, rates and facility facts are negotiated privately in the Hub.', validation: (r) => r.required().min(100).max(40000) }),
    defineField({ name: 'acceptanceText', title: 'Exact signature affirmation', type: 'text', rows: 4, description: 'The member separately affirms this statement and all exact negotiated facts. No payroll invitation, payment, kitchen booking or wage offset occurs automatically.', validation: (r) => r.required().max(2000) }),
    defineField({ name: 'approvalReference', title: 'Template approval authority / evidence', type: 'string', validation: (r) => r.required().max(1000) }),
    defineField({ name: 'replyEmail', title: 'Agreement reply contact', type: 'string', validation: (r) => r.required().email().max(254) }),
  ],
  preview: { select: { title: 'title', subtitle: 'version' } },
});
