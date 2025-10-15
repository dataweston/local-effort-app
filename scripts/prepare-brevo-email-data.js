#!/usr/bin/env node
/**
 * Pizza Funder Email Data Preparation Script
 * 
 * This script fetches live data from your APIs and formats it
 * for use in Brevo email campaigns. Run this before sending emails
 * to get the latest numbers.
 * 
 * Usage:
 *   node scripts/prepare-brevo-email-data.js
 *   node scripts/prepare-brevo-email-data.js --production
 */

const https = require('https');

// Configuration
const IS_PRODUCTION = process.argv.includes('--production');
const BASE_URL = IS_PRODUCTION 
  ? 'https://localeffortfood.com' 
  : 'http://localhost:5173';

console.log(`\n🍕 Pizza Funder Email Data Generator`);
console.log(`📍 Using: ${BASE_URL}\n`);

/**
 * Helper to fetch JSON from URL
 */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');
    
    protocol.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Failed to parse JSON: ${err.message}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Format date for email display
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format long date for updates
 */
function formatLongDate(dateString) {
  const date = new Date(dateString);
  const options = { 
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Truncate text to specified length
 */
function truncate(text, maxLength = 150) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Extract plain text from Portable Text blocks
 */
function portableTextToPlainText(blocks) {
  if (!blocks || !Array.isArray(blocks)) return '';
  
  return blocks
    .filter(block => block._type === 'block')
    .map(block => {
      if (block.children) {
        return block.children
          .map(child => child.text)
          .join('');
      }
      return '';
    })
    .join(' ');
}

/**
 * Main function to gather all data
 */
async function gatherEmailData() {
  try {
    console.log('📊 Fetching campaign status...');
    
    // 1. Fetch Pizza Funder Status
    const status = await fetchJSON(`${BASE_URL}/api/pizzafunder/status`);
    console.log(`✅ Status: ${status.pizzas} pizzas, ${status.backers} backers`);
    
    // Calculate progress
    const progressPercent = Math.round((status.pizzas / status.goal) * 100);
    const remaining = status.goal - status.pizzas;
    
    // 2. Fetch Campaign Data from Sanity (for events and updates)
    console.log('\n📅 Fetching events and updates from Sanity...');
    
    const sanityQuery = encodeURIComponent(`*[_type == "crowdfundingCampaign" && slug.current == "local-pizza-by-local-effort-let-s-make-1000-pizzas"][0]{
      events[]{
        _key,
        location,
        tagline,
        summary,
        startDate,
        endDate,
        timingNote,
        foodType,
        status,
        ticketsUrl,
        ctaLabel,
        locationDetails
      },
      "featuredPublicEvents": featuredPublicEvents[]->{ 
        _id,
        location,
        tagline,
        summary,
        startDate,
        endDate,
        timingNote,
        foodType,
        status,
        ticketsUrl,
        ctaLabel,
        locationDetails
      },
      "updates": updates[]->{ 
        title, 
        publishedAt, 
        body,
        slug
      } | order(publishedAt desc)[0..1]
    }`);
    
    const sanityData = await fetchJSON(`${BASE_URL}/api/sanity-query?query=${sanityQuery}`);
    
    // Merge inline events and featured events (same as PizzaFunderPage does)
    const rawEvents = Array.isArray(sanityData?.events) ? sanityData.events : [];
    const importedEvents = Array.isArray(sanityData?.featuredPublicEvents) 
      ? sanityData.featuredPublicEvents 
      : [];
    const allEvents = [...rawEvents, ...importedEvents].filter(Boolean);
    
    // Filter to upcoming events only
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingEvents = allEvents
      .filter((ev) => {
        if (!ev.startDate) return false;
        const start = new Date(ev.startDate);
        const end = ev.endDate ? new Date(ev.endDate) : start;
        const boundary = new Date(end);
        boundary.setHours(23, 59, 59, 999);
        return boundary >= today;
      })
      .sort((a, b) => {
        const aDate = new Date(a.startDate);
        const bDate = new Date(b.startDate);
        return aDate - bDate;
      })
      .slice(0, 2); // Only get first 2 for email
    
    console.log(`✅ Found ${upcomingEvents.length} upcoming events, ${sanityData?.updates?.length || 0} updates`);
    
    // 3. Build Brevo Variables Object
    const brevoVars = {
      // Required: Progress Stats
      PIZZAS_SOLD: status.pizzas.toString(),
      BACKERS_COUNT: status.backers.toString(),
      GOAL: status.goal.toString(),
      PROGRESS_PERCENT: progressPercent.toString(),
      REMAINING: remaining.toString(),
    };
    
    // Optional: Event 1
    if (upcomingEvents[0]) {
      const event1 = upcomingEvents[0];
      brevoVars.EVENT_1_TITLE = event1.location || 'Pizza Event';
      brevoVars.EVENT_1_LOCATION = event1.locationDetails || event1.location || '';
      brevoVars.EVENT_1_DATE = event1.startDate 
        ? formatDate(event1.startDate) 
        : event1.timingNote || '';
      brevoVars.EVENT_1_TAGLINE = event1.tagline || '';
      brevoVars.EVENT_1_FOOD_TYPE = event1.foodType || 'Pizza';
    }
    
    // Optional: Event 2
    if (upcomingEvents[1]) {
      const event2 = upcomingEvents[1];
      brevoVars.EVENT_2_TITLE = event2.location || 'Pizza Event';
      brevoVars.EVENT_2_LOCATION = event2.locationDetails || event2.location || '';
      brevoVars.EVENT_2_DATE = event2.startDate 
        ? formatDate(event2.startDate) 
        : event2.timingNote || '';
      brevoVars.EVENT_2_TAGLINE = event2.tagline || '';
      brevoVars.EVENT_2_FOOD_TYPE = event2.foodType || 'Pizza';
    }
    
    // Optional: Update 1
    if (sanityData?.updates?.[0]) {
      const update1 = sanityData.updates[0];
      const bodyText = portableTextToPlainText(update1.body);
      
      brevoVars.UPDATE_1_TITLE = update1.title || 'Campaign Update';
      brevoVars.UPDATE_1_DATE = update1.publishedAt 
        ? formatLongDate(update1.publishedAt) 
        : '';
      brevoVars.UPDATE_1_EXCERPT = truncate(bodyText, 150);
      brevoVars.UPDATE_1_LINK = `${IS_PRODUCTION ? 'https://localeffortfood.com' : BASE_URL}/pizzafunder#updates`;
    }
    
    // Optional: Update 2
    if (sanityData?.updates?.[1]) {
      const update2 = sanityData.updates[1];
      const bodyText = portableTextToPlainText(update2.body);
      
      brevoVars.UPDATE_2_TITLE = update2.title || 'Campaign Update';
      brevoVars.UPDATE_2_DATE = update2.publishedAt 
        ? formatLongDate(update2.publishedAt) 
        : '';
      brevoVars.UPDATE_2_EXCERPT = truncate(bodyText, 150);
      brevoVars.UPDATE_2_LINK = `${IS_PRODUCTION ? 'https://localeffortfood.com' : BASE_URL}/pizzafunder#updates`;
    }
    
    // 4. Display Results
    console.log('\n' + '='.repeat(60));
    console.log('📧 BREVO EMAIL VARIABLES');
    console.log('='.repeat(60));
    console.log('\nCopy these values into Brevo when creating your campaign:\n');
    
    // Display as formatted table
    Object.entries(brevoVars).forEach(([key, value]) => {
      console.log(`${key.padEnd(25)} = "${value}"`);
    });
    
    console.log('\n' + '='.repeat(60));
    
    // 5. Save to JSON file for easy copy/paste
    const fs = require('fs');
    const outputPath = './emails/brevo-variables.json';
    
    fs.writeFileSync(
      outputPath, 
      JSON.stringify(brevoVars, null, 2),
      'utf8'
    );
    
    console.log(`\n✅ Saved to: ${outputPath}`);
    console.log(`\nYou can also import this JSON directly into Brevo!\n`);
    
    // 6. Generate Brevo import format
    const brevoImportFormat = {
      params: brevoVars,
      subject: `🍕 We're at ${progressPercent}% - ${remaining} pizzas to go!`
    };
    
    const brevoImportPath = './emails/brevo-import.json';
    fs.writeFileSync(
      brevoImportPath,
      JSON.stringify(brevoImportFormat, null, 2),
      'utf8'
    );
    
    console.log(`📤 Brevo import format saved to: ${brevoImportPath}\n`);
    
  } catch (error) {
    console.error('\n❌ Error fetching data:');
    console.error(error.message);
    console.error('\nTroubleshooting:');
    console.error('- Make sure your dev server is running (npm run dev)');
    console.error('- Or use --production flag to fetch from live site');
    console.error('- Check that /api/pizzafunder/status is working');
    process.exit(1);
  }
}

// Run the script
gatherEmailData();
