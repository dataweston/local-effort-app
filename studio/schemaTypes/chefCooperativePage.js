import {pageRichText} from './objects/richTextBlock'
import {chefCooperativeContentErrors, REQUIRED_TEXT, REQUIRED_RICH} from '../../shared/chef-cooperative-content.mjs'

const required = (Rule) => Rule.required()
const text = (name, title = name) => ({name, title, type: 'string', validation: required})
const rich = (name, title = name) => ({name, title, type: 'array', of: [pageRichText()], validation: (Rule) => Rule.required().min(1)})
const list = (name, title) => ({name, title, type: 'array', of: [{type: 'string', validation: required}], validation: (Rule) => Rule.required().min(1)})
const entries = (name, title, minimum) => ({name, title, type: 'array', of: [{type: 'object', fields: [text('heading', 'Heading'), rich('body', 'Explanation')]}], validation: (Rule) => Rule.required().min(minimum)})
const section = (name, title, fields) => ({name, title, type: 'object', fields, validation: required})

export default {
  name: 'chefCooperativePage',
  title: 'Chef Cooperative Page',
  type: 'document',
  description: 'Public proposal at /chef-cooperative, separate from customer Localist. Editing copy does not admit members, adopt terms, charge dues or grant rights. Keep no-signup-fee, proposal and independence disclosures explicit.',
  validation: (Rule) => Rule.custom((document) => {
    if (!document) return true
    const errors = chefCooperativeContentErrors({...document, _id: document._id?.replace(/^drafts\./, '')})
    return errors.length ? errors.join(' ') : true
  }),
  fields: [
    ...REQUIRED_TEXT.map((name) => text(name)),
    ...REQUIRED_RICH.map((name) => rich(name)),
    section('dues', 'Proposed operating dues — not adopted', [
      text('heading'),
      {name: 'recommendedMonthlyAmountCents', title: 'Recommended monthly amount (USD cents)', type: 'number', description: 'A recommendation only. Do not adopt a price or enable collection through this document.', validation: (Rule) => Rule.required().integer().positive()},
      text('amountLabel', 'Amount context / cadence'), text('proposalLabel', 'Visible proposal status'),
      rich('rationale', 'Purpose and limits'), rich('collectionNotice', 'No collection before approved admission and final agreements'),
      text('undecidedHeading'), list('undecidedTerms', 'Decisions required before collection'),
    ]),
    entries('benefits', 'Proposed benefits and limitations', 5),
    section('equity', 'Conditional ownership — no equity offer', [
      text('heading'), rich('body', 'Ownership proposal and no-grant disclosures'), text('unresolvedHeading'), list('unresolvedTerms', 'Unresolved ownership decisions'),
    ]),
    section('application', 'Private Hub application', [
      text('heading'), rich('body'), text('ctaLabel', 'Application link label (destination is fixed in code)'), entries('nextSteps', 'Application and review steps', 3),
    ]),
    section('privacy', 'Private application and optional public draft', [text('heading'), rich('body', 'Privacy, moderation and secure tax-onboarding boundary')]),
    section('contact', 'Questions and reply contact', [text('heading'), rich('body'), {name: 'email', title: 'Reply email', type: 'string', validation: (Rule) => Rule.required().email()}, text('label', 'Email link label')]),
    {
      name: 'directory', title: 'Live moderated chef directory', type: 'object',
      description: 'Disabled until publication terms and owner moderation are ready. Profiles are read live; private applications are never exported.',
      fields: [
        {name: 'enabled', title: 'Enable the moderated directory', type: 'boolean', initialValue: false},
        {name: 'heading', title: 'Directory heading', type: 'string', validation: Rule => Rule.custom((value, context) => context.parent?.enabled && !value?.trim() ? 'Required when enabled' : true)},
        {name: 'body', title: 'Directory introduction', type: 'text', validation: Rule => Rule.custom((value, context) => context.parent?.enabled && !value?.trim() ? 'Required when enabled' : true)},
      ],
    },
    {
      name: 'heroImage', title: 'Optional real photograph', type: 'image', options: {hotspot: true},
      description: 'Use an existing authorized photograph, not stock or an implied kitchen-access guarantee.',
      fields: [{name: 'alt', title: 'Alternative text', type: 'string', validation: (Rule) => Rule.custom((value, context) => context.parent?.asset && !value?.trim() ? 'Describe the photograph for screen readers.' : true)}, {name: 'caption', title: 'Caption', type: 'string'}],
    },
  ],
  preview: {prepare: () => ({title: 'Chef Cooperative — public proposal'})},
}
