import http from 'k6/http';
import { check } from 'k6';
import { loginAndGetSession } from '../../../utils/auth.js';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const TEST_USER = '+79001234567';
const TEST_PASSWORD = 'test123';

const SMALL_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.90'],
    http_req_duration: ['p(95)<3000'],
  },
};

/**
 * Worker Avatar Tests
 * POST /api/worker/{id}/avatar
 * DELETE /api/worker/{id}/avatar
 */
export default function () {
  const jsonHeaders = { 'Content-Type': 'application/json' };

  console.log('\n🔐 Authenticating...');
  const sessionid = loginAndGetSession(http, BASE_URL, TEST_USER, TEST_PASSWORD);
  if (!sessionid) { console.error('❌ Auth failed'); return; }

  const authJsonHeaders = { ...jsonHeaders, 'Cookie': `sessionid=${sessionid}` };
  const authHeaders = { 'Cookie': `sessionid=${sessionid}` };

  // Setup: create worker
  const createRes = http.post(`${BASE_URL}/api/worker`, JSON.stringify({
    full_name: 'Test Worker Avatar K6',
    specialization: 'Сантехник',
    work_city: 'Москва',
    work_region: 'Московская область',
    search_status: 'active_search',
    contact_phone: '+7 (999) 123-45-67',
    contact_person: 'Test Worker',
  }), { headers: authJsonHeaders });

  if (createRes.status !== 200 && createRes.status !== 201) {
    console.error('❌ Failed to create worker:', createRes.body); return;
  }
  const workerId = createRes.json('id');
  console.log(`✅ Worker created: ID=${workerId}`);

  const imageFile = http.file(Buffer.from(SMALL_PNG_B64, 'base64'), 'avatar.png', 'image/png');

  // Test 1: Upload avatar — success
  console.log('\n🖼️  Test 1: Upload avatar...');
  const uploadRes = http.post(
    `${BASE_URL}/api/worker/${workerId}/avatar`,
    { avatar: imageFile },
    { headers: authHeaders }
  );
  console.log(`Upload: ${uploadRes.status} ${uploadRes.body}`);
  check(uploadRes, {
    '[Upload] status 200 or 201': (r) => r.status === 200 || r.status === 201,
    '[Upload] has url': (r) => {
      try { const b = r.json(); return typeof b.url === 'string' && b.url.length > 0; } catch { return false; }
    },
    '[Upload] url is path': (r) => {
      try { const b = r.json(); return b.url && (b.url.startsWith('http') || b.url.startsWith('/')); } catch { return false; }
    },
  });

  // Test 2: Upload — non-existent worker
  console.log('\n❌ Test 2: Non-existent worker...');
  const uploadWrongRes = http.post(`${BASE_URL}/api/worker/999999/avatar`, { avatar: imageFile }, { headers: authHeaders });
  check(uploadWrongRes, { '[Upload Wrong ID] 404': (r) => r.status === 404 });

  // Test 3: Upload — unauthenticated
  console.log('\n🔒 Test 3: Unauthenticated...');
  const uploadUnauthRes = http.post(`${BASE_URL}/api/worker/${workerId}/avatar`, { avatar: imageFile });
  check(uploadUnauthRes, { '[Upload Unauth] 401 or 403': (r) => r.status === 401 || r.status === 403 });

  // Test 4: Delete avatar — success
  console.log('\n🗑️  Test 4: Delete avatar...');
  const deleteRes = http.del(`${BASE_URL}/api/worker/${workerId}/avatar`, null, { headers: authHeaders });
  console.log(`Delete: ${deleteRes.status}`);
  check(deleteRes, { '[Delete] 200 or 204': (r) => r.status === 200 || r.status === 204 });

  // Test 5: Delete — non-existent worker
  console.log('\n❌ Test 5: Delete non-existent...');
  const deleteWrongRes = http.del(`${BASE_URL}/api/worker/999999/avatar`, null, { headers: authHeaders });
  check(deleteWrongRes, { '[Delete Wrong ID] 404': (r) => r.status === 404 });

  // Cleanup
  http.del(`${BASE_URL}/api/worker/${workerId}`, null, { headers: authJsonHeaders });
  console.log('\n✅ Worker avatar tests completed');
}
