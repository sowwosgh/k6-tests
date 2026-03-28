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
 * Order Avatar Tests
 *
 * Tests:
 * 1. Upload avatar — success (200/201), response has url
 * 2. Upload avatar — non-existent order (404)
 * 3. Upload avatar — unauthenticated (401)
 * 4. Delete avatar — success (200/204)
 * 5. Delete avatar — non-existent order (404)
 */
export default function () {
  const jsonHeaders = { 'Content-Type': 'application/json' };

  console.log('\n🔐 Authenticating...');
  const sessionid = loginAndGetSession(http, BASE_URL, TEST_USER, TEST_PASSWORD);

  if (!sessionid) {
    console.error('❌ Failed to authenticate');
    return;
  }

  const authJsonHeaders = { ...jsonHeaders, 'Cookie': `sessionid=${sessionid}` };
  const authHeaders = { 'Cookie': `sessionid=${sessionid}` };

  console.log('✅ Authenticated');

  // ===========================================
  // Setup: Create Order
  // ===========================================
  console.log('\n📝 Creating order...');
  const createRes = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({
      title: 'Test Order for Avatar',
      work_type: 'temporary',
      city: 'Москва',
      description: 'Test order for avatar upload tests',
      urgency: 'normal',
      status: 'active',
      type: 'order',
    }),
    { headers: authJsonHeaders }
  );

  if (createRes.status !== 200 && createRes.status !== 201) {
    console.error('❌ Failed to create order:', createRes.body);
    return;
  }

  const orderId = createRes.json('id');
  console.log(`✅ Order created: ID=${orderId}`);

  const imageFile = http.file(
    Buffer.from(SMALL_PNG_B64, 'base64'),
    'avatar.png',
    'image/png'
  );

  // ===========================================
  // Test 1: Upload Avatar — Success
  // ===========================================
  console.log('\n🖼️  Test 1: Upload avatar (success)...');
  const uploadRes = http.post(
    `${BASE_URL}/api/orders/${orderId}/avatar`,
    { avatar: imageFile },
    { headers: authHeaders }
  );

  console.log(`Upload status: ${uploadRes.status}`);
  console.log('Upload response:', uploadRes.body);

  check(uploadRes, {
    '[Upload] status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    '[Upload] response has url field': (r) => {
      try {
        const body = r.json();
        return typeof body.url === 'string' && body.url.length > 0;
      } catch (e) { return false; }
    },
    '[Upload] url looks like a path': (r) => {
      try {
        const body = r.json();
        return body.url && (body.url.startsWith('http') || body.url.startsWith('/'));
      } catch (e) { return false; }
    },
  });

  // ===========================================
  // Test 2: Upload Avatar — Non-Existent Order
  // ===========================================
  console.log('\n❌ Test 2: Upload avatar to non-existent order...');
  const uploadWrongRes = http.post(
    `${BASE_URL}/api/orders/999999/avatar`,
    { avatar: imageFile },
    { headers: authHeaders }
  );

  console.log(`Upload wrong id status: ${uploadWrongRes.status}`);

  check(uploadWrongRes, {
    '[Upload Wrong ID] status is 404': (r) => r.status === 404,
  });

  // ===========================================
  // Test 3: Upload Avatar — Unauthenticated
  // ===========================================
  console.log('\n🔒 Test 3: Upload avatar without auth...');
  const uploadUnauthRes = http.post(
    `${BASE_URL}/api/orders/${orderId}/avatar`,
    { avatar: imageFile }
  );

  console.log(`Upload unauth status: ${uploadUnauthRes.status}`);

  check(uploadUnauthRes, {
    '[Upload Unauth] status is 401 or 403': (r) => r.status === 401 || r.status === 403,
  });

  // ===========================================
  // Test 4: Delete Avatar — Success
  // ===========================================
  console.log('\n🗑️  Test 4: Delete avatar (success)...');
  const deleteRes = http.del(
    `${BASE_URL}/api/orders/${orderId}/avatar`,
    null,
    { headers: authHeaders }
  );

  console.log(`Delete status: ${deleteRes.status}`);

  check(deleteRes, {
    '[Delete] status is 200 or 204': (r) => r.status === 200 || r.status === 204,
  });

  // ===========================================
  // Test 5: Delete Avatar — Non-Existent Order
  // ===========================================
  console.log('\n❌ Test 5: Delete avatar on non-existent order...');
  const deleteWrongRes = http.del(
    `${BASE_URL}/api/orders/999999/avatar`,
    null,
    { headers: authHeaders }
  );

  console.log(`Delete wrong id status: ${deleteWrongRes.status}`);

  check(deleteWrongRes, {
    '[Delete Wrong ID] status is 404': (r) => r.status === 404,
  });

  // Cleanup
  http.del(`${BASE_URL}/api/orders/${orderId}`, null, { headers: authJsonHeaders });
  console.log('\n✅ Order avatar tests completed');
}
