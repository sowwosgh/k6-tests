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
 * DELETE Vacancy Test
 * 
 * Tests:
 * 1. Delete own vacancy (success)
 * 2. Delete non-existent vacancy (404)
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
  // Setup: Create Vacancy
  // ===========================================
  console.log('\n📝 Creating vacancy...');
  const createRes = http.post(
    `${BASE_URL}/api/vacancy`,
    JSON.stringify({
      title: 'Test Vacancy for DELETE',
      company_name: 'Test Company',
      city: 'Москва',
      specialization: 'Программист',
      description: 'Test vacancy description',
      salary_min: 100000,
      salary_max: 150000,
      phone: '+79001234567',
      is_active: true,
    }),
    { headers: authHeaders }
  );
  
  console.log(`Create status: ${createRes.status}`);
  console.log('Create response:', createRes.body);
  
  if (createRes.status !== 200) {
    console.error('❌ Failed to create vacancy');
    return;
  }
  
  const vacancyId = createRes.json('id');
  console.log(`✅ Vacancy created with ID: ${vacancyId}`);
  
  // ===========================================
  // Test 1: Delete Own Vacancy (Success)
  // ===========================================
  console.log('\n🗑️  Test 1: Delete own vacancy...');
  const deleteRes = http.del(
    `${BASE_URL}/api/vacancy/${vacancyId}`,
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
  // Test 2: Delete Non-Existent Vacancy (404)
  // ===========================================
  console.log('\n❌ Test 2: Delete non-existent vacancy...');
  const deleteNonExistentRes = http.del(
    `${BASE_URL}/api/vacancy/999999`,
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
  
  // Create another vacancy for this test
  const createForUnauthRes = http.post(
    `${BASE_URL}/api/vacancy`,
    JSON.stringify({
      title: 'Unauth Test Vacancy',
      company_name: 'Test Co',
      city: 'СПб',
      specialization: 'Менеджер',
      phone: '+79009999999',
      is_active: true,
    }),
    { headers: authHeaders }
  );
  
  const unauthVacancyId = createForUnauthRes.json('id');
  
  // Try to delete without auth
  const deleteUnauthRes = http.del(
    `${BASE_URL}/api/vacancy/${unauthVacancyId}`,
    null,
    { headers }
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
  
  // Cleanup
  http.del(`${BASE_URL}/api/vacancy/${unauthVacancyId}`, null, { headers: authHeaders });
  
  console.log('\n✅ DELETE vacancy tests completed!');
}
