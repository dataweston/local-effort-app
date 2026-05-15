// If some environments fail to resolve 'sanity', consider swapping to:
// import {defineConfig} from 'sanity/lib/exports'
import {defineConfig} from 'sanity'
import type {Template} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {iconPicker} from 'sanity-plugin-icon-picker'
import {colorInput} from '@sanity/color-input'
import {media} from 'sanity-plugin-media'
import {assist} from '@sanity/assist'
import {schemaTypes} from './schemaTypes/index.js'
import {blogPostBadges, releaseBadges, productBadges} from './components/documentBadges.js'

// Document types that appear in each sidebar group (used to exclude from fallback)
const GROUPED_TYPES = [
  // Store
  'product',
  // Sales
  'sale', 'salePage', 'happyMondayPage', 'happyMondaySalePage', 'tinyDinerSalePage',
  // Content
  'page', 'blogPost', 'release', 'publicEvent', 'testimonial', 'partner',
  'menu', 'menuSection', 'menuItems', 'mealPrepMenu',
  // People & Community
  'person', 'contact', 'message', 'referralParticipant',
  'membershipTier', 'crowdfundingCampaign', 'campaignUpdate', 'rewardTier',
  'activityPubFollower', 'activityPubDelivery', 'pushSubscription', 'emailSubscriber',
  // Marketing
  'campaign', 'newsletter', 'decisionPriority',
  // Settings
  'siteSettings', 'pricingFaq', 'service',
]

export default defineConfig({
  name: 'default',
  title: 'Local Effort',

  projectId: 'd6l9d0ea',
  dataset: 'localeffort',

  document: {
    badges: (prev, context) => {
      const type = context.schemaType
      if (type === 'blogPost') return [...prev, ...blogPostBadges]
      if (type === 'release') return [...prev, ...releaseBadges]
      if (type === 'product') return [...prev, ...productBadges]
      return prev
    },
  },

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('🛒 Store')
              .child(
                S.list().title('Store').items([
                  S.documentTypeListItem('product').title('Products'),
                ]),
              ),

            S.listItem()
              .title('🏷️ Sales')
              .child(
                S.list().title('Sales').items([
                  S.documentTypeListItem('sale').title('Sales'),
                  S.divider(),
                  S.documentTypeListItem('salePage').title('Sale Page Config'),
                  S.documentTypeListItem('happyMondayPage').title('Happy Monday Page'),
                  S.documentTypeListItem('happyMondaySalePage').title('Happy Monday Sale'),
                  S.documentTypeListItem('tinyDinerSalePage').title('Tiny Diner Sale'),
                ]),
              ),

            S.listItem()
              .title('📝 Content')
              .child(
                S.list().title('Content').items([
                  S.documentTypeListItem('page').title('Pages'),
                  S.documentTypeListItem('blogPost').title('Blog Posts'),
                  S.documentTypeListItem('release').title('Press Releases'),
                  S.documentTypeListItem('publicEvent').title('Events'),
                  S.documentTypeListItem('testimonial').title('Testimonials'),
                  S.documentTypeListItem('partner').title('Partners'),
                  S.divider(),
                  S.documentTypeListItem('menu').title('Menus'),
                  S.documentTypeListItem('menuSection').title('Menu Sections'),
                  S.documentTypeListItem('menuItems').title('Menu Items'),
                  S.documentTypeListItem('mealPrepMenu').title('Meal Prep Menus'),
                ]),
              ),

            S.listItem()
              .title('👥 People & Community')
              .child(
                S.list().title('People & Community').items([
                  S.documentTypeListItem('person').title('People'),
                  S.documentTypeListItem('contact').title('Contacts'),
                  S.documentTypeListItem('message').title('Messages'),
                  S.documentTypeListItem('referralParticipant').title('Referrals'),
                  S.divider(),
                  S.documentTypeListItem('membershipTier').title('Membership Tiers'),
                  S.documentTypeListItem('crowdfundingCampaign').title('Crowdfunding Campaigns'),
                  S.documentTypeListItem('campaignUpdate').title('Campaign Updates'),
                  S.documentTypeListItem('rewardTier').title('Reward Tiers'),
                  S.divider(),
                  S.documentTypeListItem('emailSubscriber').title('Email Subscribers'),
                  S.documentTypeListItem('pushSubscription').title('Push Subscriptions'),
                  S.documentTypeListItem('activityPubFollower').title('ActivityPub Followers'),
                  S.documentTypeListItem('activityPubDelivery').title('ActivityPub Deliveries'),
                ]),
              ),

            S.listItem()
              .title('📣 Marketing')
              .child(
                S.list().title('Marketing').items([
                  S.documentTypeListItem('campaign').title('Email Campaigns'),
                  S.documentTypeListItem('newsletter').title('Newsletters'),
                  S.documentTypeListItem('decisionPriority').title('Decision Priorities'),
                ]),
              ),

            S.listItem()
              .title('⚙️ Settings')
              .child(
                S.list().title('Settings').items([
                  S.documentTypeListItem('siteSettings').title('Site Settings'),
                  S.documentTypeListItem('pricingFaq').title('Pricing FAQs'),
                  S.documentTypeListItem('service').title('Services'),
                ]),
              ),

            S.divider(),

            // Safety net: any types not yet assigned to a group
            ...S.documentTypeListItems().filter(
              (li) => li.getId() && !GROUPED_TYPES.includes(li.getId()!),
            ),
          ]),
    }),
    colorInput(),
    media(),
    assist(),
    visionTool(),
    iconPicker(),
  ],

  schema: {
    types: schemaTypes,
  },
  templates: (prev: Template[]) => [
    ...prev,
    {
      id: 'sale-default',
      title: 'Sale (Standard layout)',
      schemaType: 'sale',
      value: {
        layoutVariant: 'standard',
        pickupWindow: {
          timezone: 'America/Chicago',
        },
        theme: {
          backgroundColor: {hex: '#0f172a', alpha: 1},
          foregroundColor: {hex: '#f8fafc', alpha: 1},
          accentColor: {hex: '#f97316', alpha: 1},
        },
      },
    },
    {
      id: 'sale-paikka',
      title: 'Sale (Paikka layout)',
      schemaType: 'sale',
      value: {
        layoutVariant: 'paikka',
        pickupWindow: {
          timezone: 'America/Chicago',
        },
        theme: {
          backgroundColor: {hex: '#f6f3ed', alpha: 1},
          foregroundColor: {hex: '#1f1b16', alpha: 1},
          accentColor: {hex: '#b45309', alpha: 1},
          cardStyle: 'frosted',
        },
      },
    },
  ],
})
