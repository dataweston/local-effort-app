// Test script to verify the subscribe API endpoint
const { createApiApp } = require('./backend/api/index');

async function testSubscribe() {
  console.log('\n🔍 Testing /api/subscribe endpoint...\n');
  
  const app = createApiApp();
  
  // Check if BREVO_API_KEY is set
  if (!process.env.BREVO_API_KEY) {
    console.log('⚠️  WARNING: BREVO_API_KEY environment variable is not set!');
    console.log('   This means emails won\'t actually be saved to Brevo.\n');
  } else {
    console.log('✅ BREVO_API_KEY is configured\n');
  }
  
  // Check if SANITY_PROJECT_ID is set
  if (!process.env.SANITY_PROJECT_ID) {
    console.log('⚠️  WARNING: SANITY_PROJECT_ID environment variable is not set!');
    console.log('   This means emails won\'t be mirrored to Sanity.\n');
  } else {
    console.log('✅ SANITY_PROJECT_ID is configured\n');
  }
  
  // Create a mock request
  const testEmail = 'test@example.com';
  console.log(`📧 Testing subscription with email: ${testEmail}\n`);
  
  // Mock Express request/response
  const mockReq = {
    method: 'POST',
    url: '/api/subscribe',
    body: { email: testEmail },
    headers: { 'content-type': 'application/json' },
  };
  
  const mockRes = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      console.log(`📤 Response Status: ${this.statusCode}`);
      console.log('📤 Response Body:', JSON.stringify(data, null, 2));
      return this;
    },
    send(data) {
      this.body = data;
      console.log(`📤 Response Status: ${this.statusCode}`);
      console.log('📤 Response Body:', data);
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
    },
  };
  
  try {
    // Find the route handler
    const router = app._router;
    let found = false;
    
    for (const layer of router.stack) {
      if (layer.name === 'router' && layer.regexp.test('/api/subscribe')) {
        for (const route of layer.handle.stack) {
          if (route.route && route.route.path === '/subscribe' && route.route.methods.post) {
            found = true;
            console.log('✅ Found /api/subscribe POST route\n');
            console.log('🔄 Executing handler...\n');
            await route.route.stack[0].handle(mockReq, mockRes);
            
            if (mockRes.statusCode === 200) {
              console.log('\n✅ SUCCESS: Subscribe endpoint is working!\n');
            } else {
              console.log('\n❌ ERROR: Subscribe endpoint returned an error\n');
            }
            break;
          }
        }
      }
    }
    
    if (!found) {
      console.log('❌ ERROR: Could not find /api/subscribe POST route\n');
    }
  } catch (error) {
    console.error('\n❌ ERROR during test:', error.message);
    console.error(error.stack);
  }
}

testSubscribe();
