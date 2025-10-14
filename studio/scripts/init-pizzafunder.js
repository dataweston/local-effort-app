/* eslint-disable no-console, no-undef */
// Script to initialize a PizzaFunder campaign in Sanity
// Run this from the studio directory: `npx sanity exec scripts/init-pizzafunder.js --with-user-token`

import { getCliClient } from 'sanity/cli';

const client = getCliClient();

const pizzafunderCampaign = {
  _type: 'crowdfundingCampaign',
  title: 'PizzaFunder 2025',
  slug: {
    _type: 'slug',
    current: 'pizzafunder'
  },
  description: [
    {
      _type: 'block',
      style: 'normal',
      children: [
        {
          _type: 'span',
          text: 'Support Local Effort by pre-ordering delicious pizzas! Every pizza you pledge helps us build our community kitchen and bring fresh, local food to more neighbors.'
        }
      ]
    }
  ],
  pizzaGoal: 1000,
  pizzasSold: 0,
  piesSold: 0,
  goal: 10000,
  raisedAmount: 0,
  backers: 0,
  endDate: new Date('2025-12-31T23:59:59.000Z').toISOString(),
  story: [
    {
      _type: 'block',
      style: 'h2',
      children: [
        {
          _type: 'span',
          text: 'Our Pizza Mission'
        }
      ]
    },
    {
      _type: 'block',
      style: 'normal',
      children: [
        {
          _type: 'span',
          text: 'At Local Effort, we believe great food brings people together. Our PizzaFunder campaign is more than just pizza – it\'s about building community, supporting local farmers, and creating jobs in our neighborhood.'
        }
      ]
    },
    {
      _type: 'block',
      style: 'h3',
      children: [
        {
          _type: 'span',
          text: 'What Makes Our Pizza Special'
        }
      ]
    },
    {
      _type: 'block',
      style: 'normal',
      children: [
        {
          _type: 'span',
          text: '🍕 Fresh, locally-sourced ingredients\n🌾 House-made dough from scratch\n🧀 Real cheese, never frozen\n❤️ Made with love by our team'
        }
      ]
    }
  ],
  goals: [
    {
      _type: 'block',
      style: 'h3',
      children: [
        {
          _type: 'span',
          text: 'Campaign Goals'
        }
      ]
    },
    {
      _type: 'block',
      style: 'normal',
      children: [
        {
          _type: 'span',
          text: 'With your support, we aim to:\n\n• Sell 1,000 pizzas to fund our kitchen expansion\n• Create 5 new jobs in the community\n• Partner with 3 local farms for fresh ingredients\n• Launch our weekly pizza night series'
        }
      ]
    }
  ],
  faq: [
    {
      _type: 'faqItem',
      _key: 'faq-1',
      question: 'When will I receive my pizza?',
      answer: 'Pizzas can be picked up at designated events throughout the campaign. Check the Events tab for pickup dates and locations!'
    },
    {
      _type: 'faqItem',
      _key: 'faq-2',
      question: 'What pizza flavors are available?',
      answer: 'Our menu rotates seasonally! Classic options include Margherita, Pepperoni, and Veggie Supreme. Special flavors will be announced closer to pickup dates.'
    },
    {
      _type: 'faqItem',
      _key: 'faq-3',
      question: 'Can I donate without receiving a pizza?',
      answer: 'Absolutely! You can make a contribution to support our mission without selecting a pizza reward. Every dollar helps!'
    },
    {
      _type: 'faqItem',
      _key: 'faq-4',
      question: 'Are the pizzas frozen or fresh?',
      answer: 'All pizzas are made fresh on-site and never frozen. We prepare them the day of pickup for maximum quality and flavor.'
    },
    {
      _type: 'faqItem',
      _key: 'faq-5',
      question: 'What if I have dietary restrictions?',
      answer: 'We offer gluten-free crusts and vegan cheese options. Please indicate your dietary needs when you pledge, and we\'ll accommodate you!'
    }
  ]
};

async function createPizzafunderCampaign() {
  try {
    console.log('🍕 Creating PizzaFunder campaign in Sanity...');
    
    // Check if pizzafunder campaign already exists
    const existing = await client.fetch(
      `*[_type == "crowdfundingCampaign" && slug.current == "pizzafunder"][0]`
    );
    
    if (existing) {
      console.log('⚠️  PizzaFunder campaign already exists!');
      console.log(`   Document ID: ${existing._id}`);
      console.log('   To update, edit it in Sanity Studio or delete it first.');
      return;
    }
    
    // Create the campaign
    const result = await client.create(pizzafunderCampaign);
    
    console.log('✅ PizzaFunder campaign created successfully!');
    console.log(`   Document ID: ${result._id}`);
    console.log(`   Visit: /pizzafunder to see it in action`);
    console.log(`   Edit in Studio: /studio/desk/crowdfundingCampaign;${result._id}`);
    
  } catch (error) {
    console.error('❌ Error creating campaign:', error.message);
    throw error;
  }
}

createPizzafunderCampaign()
  .then(() => {
    console.log('\n🎉 Done! Your PizzaFunder campaign is ready.');
    console.log('   Next steps:');
    console.log('   1. Visit /studio to customize the content');
    console.log('   2. Upload a hero image');
    console.log('   3. Add pizza reward pickup events');
    console.log('   4. Publish your campaign!');
  })
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });
