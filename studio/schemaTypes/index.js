// schemas/index.js
// This file imports all your schemas and exports them as an array.

import page from './page'
import siteSettings from './siteSettings'
import person from './person'
import service from './service'
import menu from './menu'
import menuSection from './menuSection'
import pricingFaq from './pricingFaq'
import crowdfundingCampaign from './crowdfundingCampaign'
import campaignUpdate from './campaignUpdate'
import rewardTier from './rewardTier'
import partner from './partner'
import mealPrepMenu from './mealPrepMenu'
import testimonial from './testimonial'
import contact from './contact'
import message from './message'
import campaign from './campaign'
import pushSubscription from './pushSubscription'

export const schemaTypes = [
  page,
  siteSettings,
  person,
  service,
  menu,
  menuSection,
  pricingFaq,
  crowdfundingCampaign,
  rewardTier,
  campaignUpdate
  ,partner
  ,mealPrepMenu
  ,testimonial
  ,contact
  ,message
  ,campaign
  ,pushSubscription
]
