import http from 'k6/http';
import { check } from 'k6';
import { loginAndGetSession } from '../../../utils/auth.js';
import { generateINN, generateCompanyName, pause } from '../../../utils/generators.js';

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
 * Customer Logo Tests (avatar = logo for customer)
 * POST /api/customer/{id}/logo
 * DELETE /api/customer/{id}/logo
 */
export default function () {
  const jsonHeaders = { 'Content-Type': 'application/json' };

  console.log('\n🔐 Authenticating...');
  const sessionid = loginAndGetSession(http, BASE_URL, TEST_USER, TEST_PASSWORD);
  if (!sessionid) { console.error('❌ Auth failed'); return; }

  const authJsonHeaders = { ...jsonHeaders, 'Cookie': `sessionid=${sessionid}` };
  const authHeaders = { 'Cookie': `sessionid=${sessionid}` };

  // Setup: create customer
  pause(10);
  const createRes = http.post(`${BASE_URL}/api/customer`, JSON.stringify({
    company_name: generateCompanyName('Заказчик K6 Logo'),
    inn: generateINN(),
    customer_type: 'Частный застройщик',
    city: 'Москва',
    region: 'Московская область',
    contact_person: 'Тестовый Контактный',
    contact_phone: '+7 (777) 888-99-00',
    contact_email: 'customer-logo@k6test.com',
    about: 'Тест логотипа заказчика',
  }), { headers: authJsonHeaders });

  if (createRes.status !== 200 && createRes.status !== 201) {
    console.error('❌ Failed to create customer:', createRes.body); return;
  }
  const customerId = createRes.json('id');
  console.log(`✅ Customer created: ID=${customerId}`);

  const imageFile = http.file(Buffer.from(SMALL_PNG_B64, 'base64'), 'logo.png', 'image/png');

  // Test 1: Upload logo — success
  console.log('\n🖼️  Test 1: Upload logo...');
  const uploadRes = http.post(
    `${BASE_URL}/api/customer/${customerId}/logo`,
    { logo: imageFile },
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

  // Test 2: Upload — non-existent customer
  console.log('\n❌ Test 2: Non-existent customer...');
  const uploadWrongRes = http.post(`${BASE_URL}/api/customer/999999/logo`, { logo: imageFile }, { headers: authHeaders });
  check(uploadWrongRes, { '[Upload Wrong ID] 404': (r) => r.status === 404 });

  // Test 3: Upload — unauthenticated
  console.log('\n🔒 Test 3: Unauthenticated...');
  const uploadUnauthRes = http.post(`${BASE_URL}/api/customer/${customerId}/logo`, { logo: imageFile });
  check(uploadUnauthRes, { '[Upload Unauth] 401 or 403': (r) => r.status === 401 || r.status === 403 });

  // Test 4: Delete logo — success
  console.log('\n🗑️  Test 4: Delete logo...');
  const deleteRes = http.del(`${BASE_URL}/api/customer/${customerId}/logo`, null, { headers: authHeaders });
  console.log(`Delete: ${deleteRes.status}`);
  check(deleteRes, { '[Delete] 200 or 204': (r) => r.status === 200 || r.status === 204 });

  // Test 5: Delete — non-existent customer
  console.log('\n❌ Test 5: Delete non-existent...');
  const deleteWrongRes = http.del(`${BASE_URL}/api/customer/999999/logo`, null, { headers: authHeaders });
  check(deleteWrongRes, { '[Delete Wrong ID] 404': (r) => r.status === 404 });

  // Cleanup
  http.del(`${BASE_URL}/api/customer/${customerId}`, null, { headers: authJsonHeaders });
  console.log('\n✅ Customer logo tests completed');
}
