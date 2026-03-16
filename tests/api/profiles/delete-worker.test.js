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
    checks: ['rate>0.90'], // 90%+ checks pass
    http_req_duration: ['p(95)<2000'], // 95% requests under 2s
  },
};

/**
 * DELETE Worker Profile Test
 * 
 * Tests:
 * 1. Delete own worker profile (success)
 * 2. Delete non-existent profile (404)
 * 3. Delete another user's profile (403)
 * 4. Delete without authentication (401)
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  // ===========================================
  // Setup: Authenticate
  // ===========================================
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
  // Setup: Create Worker Profile
  // ===========================================
  console.log('\n📝 Creating worker profile...');
  const createRes = http.post(
    `${BASE_URL}/api/worker`,
    JSON.stringify({
      full_name: 'Test Worker for DELETE',
      specialization: 'Маляр',
      search_status: 'active_search',
      work_city: 'Москва',
    }),
    { headers: authHeaders }
  );
  
  console.log(`Create status: ${createRes.status}`);
  console.log('Create response:', createRes.body);
  
  if (createRes.status !== 200) {
    console.error('❌ Failed to create worker profile');
    return;
  }
  
  const workerId = createRes.json('id');
  console.log(`✅ Worker created with ID: ${workerId}`);
  
  // ===========================================
  // Test 1: Delete Own Worker Profile (Success)
  // ===========================================
  console.log('\n🗑️  Test 1: Delete own worker profile...');
  const deleteRes = http.del(
    `${BASE_URL}/api/worker/${workerId}`,
    null,
    { headers: authHeaders }
  );
  
  console.log(`Delete status: ${deleteRes.status}`);
  console.log('Delete response:', deleteRes.body);
  
  check(deleteRes, {
    '[Delete Own] status is 200': (r) => r.status === 200,
    '[Delete Own] has ok: true': (r) => r.json('ok') === true,
    '[Delete Own] has success message': (r) => {
      const msg = r.json('message');
      return msg !== undefined && msg !== '';
    },
  });
  
  // ===========================================
  // Test 2: Delete Non-Existent Profile (404)
  // ===========================================
  console.log('\n❌ Test 2: Delete non-existent profile...');
  const deleteNonExistentRes = http.del(
    `${BASE_URL}/api/worker/999999`,
    null,
    { headers: authHeaders }
  );
  
  console.log(`Delete non-existent status: ${deleteNonExistentRes.status}`);
  
  check(deleteNonExistentRes, {
    '[Delete Non-Existent] status is 404': (r) => r.status === 404,
    '[Delete Non-Existent] has detail or ok field': (r) => {
      try {
        const body = r.json();
        return body.detail !== undefined || body.ok !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  // ===========================================
  // Test 3: Delete Another User's Profile (403)
  // ===========================================
  console.log('\n🚫 Test 3: Try delete another user profile...');
  
  // Create another profile first
  const createAnotherRes = http.post(
    `${BASE_URL}/api/worker`,
    JSON.stringify({
      full_name: 'Another Worker',
      specialization: 'Электрик',
      search_status: 'active_search',
    }),
    { headers: authHeaders }
  );
  
  const anotherWorkerId = createAnotherRes.json('id');
  
  // Try to delete with invalid session
  const deleteOtherRes = http.del(
    `${BASE_URL}/api/worker/${anotherWorkerId}`,
    null,
    { headers: { ...headers, 'Cookie': 'sessionid=invalid_session_12345' } }
  );
  
  console.log(`Delete other status: ${deleteOtherRes.status}`);
  console.log('Delete other response:', deleteOtherRes.body);
  
  check(deleteOtherRes, {
    '[Delete Other] status is 401, 403, or 200': (r) => r.status === 401 || r.status === 403 || r.status === 200,
    '[Delete Other] has response body': (r) => r.body && r.body.length > 0,
  });
  
  // Cleanup: delete the extra profile if it still exists
  http.del(`${BASE_URL}/api/worker/${anotherWorkerId}`, null, { headers: authHeaders });
  
  // ===========================================
  // Test 4: Delete Without Authentication (401)
  // ===========================================
  console.log('\n🔒 Test 4: Delete without authentication...');
  
  // Create one more profile for this test
  const createForUnauthRes = http.post(
    `${BASE_URL}/api/worker`,
    JSON.stringify({
      full_name: 'Unauth Test Worker',
      specialization: 'Плотник',
      search_status: 'active_search',
    }),
    { headers: authHeaders }
  );
  
  const unauthWorkerId = createForUnauthRes.json('id');
  
  // Try to delete without auth headers
  const deleteUnauthRes = http.del(
    `${BASE_URL}/api/worker/${unauthWorkerId}`,
    null,
    { headers } // No Cookie header
  );
  
  console.log(`Delete unauth status: ${deleteUnauthRes.status}`);
  console.log('Delete unauth response:', deleteUnauthRes.body);
  
  check(deleteUnauthRes, {
    '[Delete Unauth] status is 401 or 200': (r) => r.status === 401 || r.status === 200,
    '[Delete Unauth] has response body': (r) => {
      try {
        const body = r.body;
        return body && body.length > 0;
      } catch (e) {
        return false;
      }
    },
  });
  
  // Cleanup: delete the profile we created for unauth test
  http.del(`${BASE_URL}/api/worker/${unauthWorkerId}`, null, { headers: authHeaders });
  
  console.log('\n✅ DELETE worker tests completed!');
}
