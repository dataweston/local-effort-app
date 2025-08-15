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
    },
    {
      name: 'story',
      title: 'Campaign Story',
      type: 'array',
      of: [{ type: 'block' }],
    },
    
  ],
}
