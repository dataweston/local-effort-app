#!/usr/bin/env node
/**
 * Test Brevo Integration
 * 
 * This script tests the Brevo contact sync without making a real purchase.
 * Use this to verify your BREVO_API_KEY and BREVO_PIZZAFUNDER_LIST_IDS are set correctly.
 * 
 * Usage:
 *   node scripts/test-brevo-integration.js
 */

require('dotenv').config();
const { addPizzaBackerToBrevo } = require('../api-handlers/_lib/brevo');

// Test data (simulates a pizza pledge)
const testPledgeData = {
  email: 'test@example.com', // Change this to your email for testing
  funder_name: 'Test User',
  pizza_count: 2,
  amount_cents: 3000, // $30.00
  reward_preference: 'pickup',
  discount_code: null,
  phone: '+15551234567',
};

async function testBrevoIntegration() {
  console.log('🍕 Testing Brevo Integration...\n');
  
  // Check environment variables
  if (!process.env.BREVO_API_KEY) {
    console.error('❌ ERROR: BREVO_API_KEY is not set in .env file');
    console.log('\nTo fix this:');
    console.log('1. Get your API key from: https://app.brevo.com/settings/keys/api');
    console.log('2. Add to .env file: BREVO_API_KEY=xkeysib-your-key-here');
    process.exit(1);
  }
  
  if (!process.env.BREVO_PIZZAFUNDER_LIST_IDS) {
    console.warn('⚠️  WARNING: BREVO_PIZZAFUNDER_LIST_IDS is not set');
    console.log('Contact will be added to Brevo but not assigned to any list.');
    console.log('To add to a list, set: BREVO_PIZZAFUNDER_LIST_IDS=123\n');
  }
  
  console.log('Configuration:');
  console.log(`  API Key: ${process.env.BREVO_API_KEY.substring(0, 15)}...`);
  console.log(`  List IDs: ${process.env.BREVO_PIZZAFUNDER_LIST_IDS || 'None'}`);
  console.log('\nTest Data:');
  console.log(`  Email: ${testPledgeData.email}`);
  console.log(`  Name: ${testPledgeData.funder_name}`);
  console.log(`  Pizzas: ${testPledgeData.pizza_count}`);
  console.log(`  Amount: $${(testPledgeData.amount_cents / 100).toFixed(2)}`);
  console.log('\nAttempting to add contact to Brevo...\n');
  
  try {
    const result = await addPizzaBackerToBrevo(testPledgeData);
    
    if (result.skipped) {
      console.log('⚠️  Brevo sync skipped:', result.reason);
      process.exit(1);
    }
    
    if (result.success) {
      console.log('✅ SUCCESS! Contact added to Brevo');
      console.log('\nNext steps:');
      console.log('1. Go to https://app.brevo.com/contact/list');
      console.log(`2. Search for: ${testPledgeData.email}`);
      console.log('3. Verify the contact has these attributes:');
      console.log('   - FIRSTNAME: Test');
      console.log('   - LASTNAME: User');
      console.log('   - PIZZA_COUNT: 2');
      console.log('   - PLEDGE_AMOUNT: 30.00');
      console.log('   - REWARD_PREFERENCE: pickup');
      console.log('\n✨ Integration is working! Pizza backers will automatically sync to Brevo.');
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check your API key is valid');
    console.log('2. Verify List IDs exist in Brevo');
    console.log('3. Check network connection');
    console.log('\nFull error details:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testBrevoIntegration();
