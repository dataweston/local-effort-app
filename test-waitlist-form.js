#!/usr/bin/env node
/**
 * Test the waitlist form submission
 * This simulates what happens when a user submits the waitlist form
 */

const testData = {
  name: 'Test User',
  email: 'test@example.com',
  phone: '612-555-1234',
  subject: 'Meal Prep Waitlist signup',
  type: 'meal-prep-waitlist',
  message: `Weekly Meal Prep Waitlist signup
Name: Test User
Email: test@example.com
Phone: 612-555-1234
Family size: 2 adults, 1 child
Children & ages: 5 years old
Days per week: 5
Meals per day: 2 (lunch, dinner)
Allergies or medical comments: Gluten-free preferred

Questions or notes:
Interested in starting next month`,
  sendCopy: false
};

console.log('Testing waitlist form submission...\n');
console.log('Test data:');
console.log(JSON.stringify(testData, null, 2));
console.log('\n');

async function testSubmission() {
  try {
    const response = await fetch('http://localhost:3001/api/messages/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('\nResponse body:');
    console.log(JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ SUCCESS! Form submission works correctly.');
      console.log('The email should be sent to yum@localeffortfood.com');
    } else {
      console.log('\n❌ FAILED! Response status:', response.status);
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log('\nMake sure the backend server is running:');
    console.log('  npm run backend:start');
  }
}

testSubmission();
