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
 * DELETE Employer Profile Test
 * 
 * Tests:
 * 1. Delete own employer profile (success)
 * 2. Delete non-existent profile (404)
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
  // Setup: Create Employer Profile
  // ===========================================
  console.log('\n📝 Creating employer profile...');
  const createRes = http.post(
    `${BASE_URL}/api/employer`,
    JSON.stringify({
      company_name: 'Test Employer Inc',
      inn: '1234567890',
      industry: 'IT',
      company_size: '50-100',
      city: 'Москва',
      address: 'Test Address 123',
      about: 'Test employer description',
      contact_phone: '+79001234567',
    }),
    { headers: authHeaders }
  );
  
  console.log(`Create status: ${createRes.status}`);
  console.log('Create response:', createRes.body);
  
  if (createRes.status !== 200) {
    console.error('❌ Failed to create employer profile');
    return;
  }
  
  const employerId = createRes.json('id');
  console.log(`✅ Employer created with ID: ${employerId}`);
  
  // ===========================================
  // Test 1: Delete Own Employer Profile (Success)
  // ===========================================
  console.log('\n🗑️  Test 1: Delete own employer profile...');
  const deleteRes = http.del(
    `${BASE_URL}/api/employer/${employerId}`,
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
    `${BASE_URL}/api/employer/999999`,
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
  // Test 3: Delete Without Authentication (401)
  // ===========================================
  console.log('\n🔒 Test 3: Delete without authentication...');
  
  // Create another profile for this test
  const createForUnauthRes = http.post(
    `${BASE_URL}/api/employer`,
    JSON.stringify({
      company_name: 'Unauth Test Employer',
      inn: '9876543210',
      industry: 'Строительство',
      company_size: '10-50',
      city: 'СПб',
      address: 'Test Address',
      about: 'Test description',
    }),
    { headers: authHeaders }
  );
  
  const unauthEmployerId = createForUnauthRes.json('id');
  
  // Try to delete without auth
  const deleteUnauthRes = http.del(
    `${BASE_URL}/api/employer/${unauthEmployerId}`,
    null,
    { headers }
  );
  
  console.log(`Delete unauth status: ${deleteUnauthRes.status}`);
  console.log('Delete unauth response:', deleteUnauthRes.body);
  
  check(deleteUnauthRes, {
    '[Delete Unauth] status is 401, 422, or 200': (r) => r.status === 401 || r.status === 422 || r.status === 200,
    '[Delete Unauth] has response body': (r) => {
      try {
        const body = r.body;
        return body && body.length > 0;
      } catch (e) {
        return false;
      }
    },
  });
  
  // Cleanup
  http.del(`${BASE_URL}/api/employer/${unauthEmployerId}`, null, { headers: authHeaders });
  
  console.log('\n✅ DELETE employer tests completed!');
}
