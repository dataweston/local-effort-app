// schemas/crowdfundingCampaign.js

export default {
  name: 'crowdfundingCampaign',
  title: 'Crowdfunding Campaign',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'The main headline for the campaign.',
    },
    {
        name: 'slug',
        title: 'Slug',
        type: 'slug',
        options: {
            source: 'title',
            maxLength: 96,
        },
        description: 'A unique, URL-friendly identifier for the campaign.',
    },
    {
      name: 'description',
      title: 'Short Description',
      type: 'text',
    },
    {
      name: 'goal',
      title: 'Funding Goal',
      type: 'number',
    },
    {
      name: 'raisedAmount',
      title: 'Amount Raised',
      type: 'number',
    },
    {
      name: 'backers',
      title: 'Number of Backers',
      type: 'number',
    },
    {
      name: 'endDate',
      title: 'End Date',
      type: 'datetime',
    },
    {
      name: 'videoUrl',
      title: 'Campaign Video URL',
      type: 'url',
      description: 'Optional: A link to a video about the campaign.',
    },
    {
        name: 'heroImage',
        title: 'Hero Image',
        type: 'image',
        options: { hotspot: true },
        description: 'The main visual for the campaign. 16:9 aspect ratio recommended.',
    },
    {
      name: 'story',
      title: 'Campaign Story',
      type: 'array',
      of: [{ type: 'block' }],
    },
    {
        name: 'rewardTiers',
        title: 'Reward Tiers',
        type: 'array',
        of: [{ type: 'reference', to: { type: 'rewardTier' }}],
        description: 'Create and link the different pledge levels.',
    },
    {
        name: 'updates',
        title: 'Campaign Updates',
        type: 'array',
        of: [{ type: 'reference', to: { type: 'campaignUpdate' }}]
    },
    {
        name: 'faq',
        title: 'FAQ',
        type: 'array',
        of: [
            {
                type: 'object',
                fields: [
                    { name: 'question', type: 'string', title: 'Question' },
                    { name: 'answer', type: 'text', title: 'Answer' },
                ],
            },
        ],
        description: 'Add frequently asked questions to build trust.',
    }
  ],
}