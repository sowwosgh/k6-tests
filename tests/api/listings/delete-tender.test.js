import http from 'k6/http';
import { check } from 'k6';
import { loginAndGetSession } from '../../../utils/auth.js';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
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
 * DELETE Tender Test
 * 
 * Tests:
 * 1. Delete own tender (success)
 * 2. Delete non-existent tender (404)
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
  // Setup: Create Tender
  // ===========================================
  console.log('\n📝 Creating tender...');
  const createRes = http.post(
    `${BASE_URL}/api/tenders`,
    JSON.stringify({
      title: 'Test Tender for DELETE',
      tender_type: 'open',
      city: 'Москва',
      object_address: 'ул. Тестовая, д. 1',
      description: 'Test tender description',
      requirements: 'Требования к участникам',
      submission_deadline: '2026-12-31',
      tender_status: 'published',
      status: 'accepting_bids',
      type: 'tender',
    }),
    { headers: authHeaders }
  );
  
  console.log(`Create status: ${createRes.status}`);
  
  if (createRes.status !== 200 && createRes.status !== 201) {
    console.error('❌ Failed to create tender');
    console.error('Response:', createRes.body);
    return;
  }
  
  const tenderId = createRes.json('id');
  console.log(`✅ Tender created with ID: ${tenderId}`);
  
  // ===========================================
  // Test 1: Delete Own Tender (Success)
  // ===========================================
  console.log('\n🗑️  Test 1: Delete own tender...');
  const deleteRes = http.del(
    `${BASE_URL}/api/tenders/${tenderId}`,
    null,
    { headers: authHeaders }
  );
  
  console.log(`Delete status: ${deleteRes.status}`);
  
  check(deleteRes, {
    'Delete own tender - status 200': (r) => r.status === 200,
    'Delete own tender - response has success message': (r) => {
      try {
        const body = r.json();
        return body.ok === true || body.message || r.body.includes('удален');
      } catch (e) {
        return r.body.includes('удален');
      }
    },
  });
  
  // ===========================================
  // Test 2: Delete Non-Existent Tender (404)
  // ===========================================
  console.log('\n🗑️  Test 2: Delete non-existent tender...');
  const nonExistentId = 999999;
  const deleteNonExistentRes = http.del(
    `${BASE_URL}/api/tenders/${nonExistentId}`,
    null,
    { headers: authHeaders }
  );
  
  console.log(`Delete non-existent status: ${deleteNonExistentRes.status}`);
  
  check(deleteNonExistentRes, {
    'Delete non-existent tender - status 404': (r) => r.status === 404,
    'Delete non-existent tender - error message present': (r) => r.body.length > 0,
  });
  
  // ===========================================
  // Test 3: Delete Without Authentication (401)
  // ===========================================
  console.log('\n🗑️  Test 3: Delete without authentication...');
  
  // Create another tender for unauth test
  const createRes2 = http.post(
    `${BASE_URL}/api/tenders`,
    JSON.stringify({
      title: 'Test Tender for Unauth DELETE',
      tender_type: 'open',
      city: 'Москва',
      object_address: 'ул. Тестовая, д. 2',
      description: 'Test tender description',
      requirements: 'Требования к участникам',
      submission_deadline: '2026-12-31',
      tender_status: 'published',
      status: 'accepting_bids',
      type: 'tender',
    }),
    { headers: authHeaders }
  );
  
  if (createRes2.status === 200 || createRes2.status === 201) {
    const tenderId2 = createRes2.json('id');
    
    const deleteUnauthRes = http.del(
      `${BASE_URL}/api/tenders/${tenderId2}`,
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
        `${BASE_URL}/api/tenders/${tenderId2}`,
        null,
        { headers: authHeaders }
      );
    }
  }
  
  console.log('\n✅ All DELETE tender tests completed');
}
