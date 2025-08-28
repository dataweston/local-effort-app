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
      description: 'The main headline for the campaign. This is a required field.',
      validation: Rule => Rule.required().error('A campaign title is required.'),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      description: 'A unique, URL-friendly identifier for the campaign. Click "Generate" to create one from the title.',
      validation: Rule => Rule.required().error('A slug is required to generate a unique URL for the campaign.'),
    },
    {
      name: 'description',
      title: 'Short Description',
      type: 'text',
      description: 'A brief, compelling summary of the campaign. This appears at the top of the page and in search results.',
      validation: Rule => Rule.required().error('A short description is required.'),
    },
    {
      name: 'goal',
      title: 'Funding Goal ($)',
      type: 'number',
      description: 'The total amount of money you aim to raise.',
      initialValue: 10000,
      validation: Rule => Rule.required().min(0).error('The funding goal must be zero or a positive number.'),
    },
    {
      name: 'raisedAmount',
      title: 'Amount Raised ($)',
      type: 'number',
      description: 'The current amount of money that has been pledged. This can be updated manually.',
      initialValue: 0,
      validation: Rule => Rule.required().min(0).error('The amount raised must be zero or a positive number.'),
    },
    {
      name: 'backers',
      title: 'Number of Backers',
      type: 'number',
      description: 'The total number of people who have backed the project.',
      initialValue: 0,
      validation: Rule => Rule.required().min(0).error('The number of backers must be zero or a positive integer.'),
    },
    {
      name: 'endDate',
      title: 'End Date',
      type: 'datetime',
      description: 'The date and time when the campaign will officially end.',
      validation: Rule => Rule.required().error('An end date for the campaign is required.'),
    },
    {
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      options: { hotspot: true },
      description: 'The main visual for the campaign. 16:9 aspect ratio is recommended. This is a required field.',
      validation: Rule => Rule.required().error('A hero image is required to visually represent the campaign.'),
    },
    {
      name: 'videoUrl',
      title: 'Campaign Video URL',
      type: 'url',
      description: 'Optional: A link to a video about the campaign (e.g., YouTube, Vimeo).',
    },
    {
      name: 'story',
      title: 'Campaign Story',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'The main content of your campaign page. Tell your story, explain your project, and show your passion.',
    },
    {
      name: 'rewardTiers',
      title: 'Reward Tiers',
      type: 'array',
      of: [{ type: 'reference', to: { type: 'rewardTier' }}],
      description: 'Create and link the different pledge levels for your backers.',
    },
    {
      name: 'updates',
      title: 'Campaign Updates',
      type: 'array',
      of: [{ type: 'reference', to: { type: 'campaignUpdate' }}],
      description: 'Add posts to keep your backers informed about the campaign\'s progress.',
    },
    {
      name: 'faq',
      title: 'FAQ',
      type: 'array',
      of: [
        {
          name: 'faqItem',
          title: 'FAQ Item',
          type: 'object',
          fields: [
            { name: 'question', type: 'string', title: 'Question', validation: Rule => Rule.required() },
            { name: 'answer', type: 'text', title: 'Answer', validation: Rule => Rule.required() },
          ],
        },
      ],
      description: 'Add frequently asked questions to build trust and proactively address backers\' concerns.',
    }
  ],
  preview: {
    select: {
      title: 'title',
      raised: 'raisedAmount',
      goal: 'goal',
      media: 'heroImage',
    },
    prepare(selection) {
      const { title, raised, goal, media } = selection;
      const progress = goal > 0 ? ((raised / goal) * 100).toFixed(0) : 0;
      return {
        title: title || 'Untitled Campaign',
        subtitle: `Raised $${(raised || 0).toLocaleString()} of $${(goal || 0).toLocaleString()} (${progress}%)`,
        media: media,
      };
    },
  },
}