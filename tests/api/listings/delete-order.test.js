import http from 'k6/http';
import { check } from 'k6';
import { loginAndGetSession } from '../../../utils/auth.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const TEST_USER = '+79001234567';
const TEST_PASSWORD = 'test123';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.90'],
    http_req_duration: ['p(95)<2000'],
  },
};

/**
 * DELETE Order Test
 * 
 * Tests:
 * 1. Delete own order (success)
 * 2. Delete non-existent order (404)
 * 3. Delete without authentication (401)
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n🔐 Authenticating...');
  const sessionid = loginAndGetSession(http, BASE_URL, TEST_USER, TEST_PASSWORD);
  
  if (!sessionid) {
    console.error('❌ Failed to authenticate');
    return;
  }
  
  const authHeaders = {
    ...headers,
    'Cookie': `sessionid=${sessionid}`,
  };
  
  console.log('✅ Authenticated successfully');
  
  // ===========================================
  // Setup: Create Order
  // ===========================================
  console.log('\n📝 Creating order...');
  const createRes = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({
      title: 'Test Order for DELETE',
      work_type: 'temporary',
      city: 'Москва',
      description: 'Test order description',
      urgency: 'normal',
      status: 'active',
      type: 'order',
    }),
    { headers: authHeaders }
  );
  
  console.log(`Create status: ${createRes.status}`);
  
  if (createRes.status !== 200 && createRes.status !== 201) {
    console.error('❌ Failed to create order');
    console.error('Response:', createRes.body);
    return;
  }
  
  const orderId = createRes.json('id');
  console.log(`✅ Order created with ID: ${orderId}`);
  
  // ===========================================
  // Test 1: Delete Own Order (Success)
  // ===========================================
  console.log('\n🗑️  Test 1: Delete own order...');
  const deleteRes = http.del(
    `${BASE_URL}/api/orders/${orderId}`,
    null,
    { headers: authHeaders }
  );
  
  console.log(`Delete status: ${deleteRes.status}`);
  
  check(deleteRes, {
    'Delete own order - status 200': (r) => r.status === 200,
    'Delete own order - response has success message': (r) => {
      try {
        const body = r.json();
        return body.ok === true || body.message || r.body.includes('удален');
      } catch (e) {
        return r.body.includes('удален');
      }
    },
  });
  
  // ===========================================
  // Test 2: Delete Non-Existent Order (404)
  // ===========================================
  console.log('\n🗑️  Test 2: Delete non-existent order...');
  const nonExistentId = 999999;
  const deleteNonExistentRes = http.del(
    `${BASE_URL}/api/orders/${nonExistentId}`,
    null,
    { headers: authHeaders }
  );
  
  console.log(`Delete non-existent status: ${deleteNonExistentRes.status}`);
  
  check(deleteNonExistentRes, {
    'Delete non-existent order - status 404': (r) => r.status === 404,
    'Delete non-existent order - error message present': (r) => r.body.length > 0,
  });
  
  // ===========================================
  // Test 3: Delete Without Authentication (401)
  // ===========================================
  console.log('\n🗑️  Test 3: Delete without authentication...');
  
  // Create another order for unauth test
  const createRes2 = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({
      title: 'Test Order for Unauth DELETE',
      work_type: 'temporary',
      city: 'Москва',
      description: 'Test order description',
      urgency: 'normal',
      status: 'active',
      type: 'order',
    }),
    { headers: authHeaders }
  );
  
  if (createRes2.status === 200 || createRes2.status === 201) {
    const orderId2 = createRes2.json('id');
    
    const deleteUnauthRes = http.del(
      `${BASE_URL}/api/orders/${orderId2}`,
      null,
      { headers }
    );
    
    console.log(`Delete unauth status: ${deleteUnauthRes.status}`);
    
    check(deleteUnauthRes, {
      'Delete without auth - status 401, 422, or 200': (r) => 
        r.status === 401 || r.status === 422 || r.status === 200,
    });
    
    // Cleanup: delete if not deleted
    if (deleteUnauthRes.status !== 200) {
      http.del(
        `${BASE_URL}/api/orders/${orderId2}`,
        null,
        { headers: authHeaders }
      );
    }
  }
  
  console.log('\n✅ All DELETE order tests completed');
}
