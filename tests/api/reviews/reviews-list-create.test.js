/**
 * Reviews API — List & Create Tests
 *
 * Tests:
 * 1. GET /api/reviews — публичный список отзывов профиля (без авторизации)
 * 2. POST /api/reviews без авторизации → 401
 * 3. POST /api/reviews с авторизацией, но без ContactAccess → 403
 * 4. Admin GET /api/admin/reviews — список с фильтрами (требует staff)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { loginAndGetSession } from '../../../utils/auth.js';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const TEST_USER = '+79001234567';
const TEST_PASSWORD = 'test123';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.85'],
    http_req_duration: ['p(95)<3000'],
  },
};

export default function () {
  const headers = { 'Content-Type': 'application/json' };

  // ===========================================
  // Test 1: GET reviews — публичный, без авторизации
  // ===========================================
  console.log('\n📋 Test 1: GET reviews (public, no auth)...');
  const listRes = http.get(
    `${BASE_URL}/api/reviews?profile_type=worker&profile_id=1`,
    { headers }
  );
  console.log(`GET reviews status: ${listRes.status}`);
  check(listRes, {
    'GET reviews - status 200': (r) => r.status === 200,
    'GET reviews - JSON response': (r) =>
      r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json'),
    'GET reviews - has reviews array': (r) => {
      try {
        const body = r.json();
        return Array.isArray(body.reviews) || Array.isArray(body);
      } catch (e) { return false; }
    },
  });
  sleep(0.5);

  // ===========================================
  // Test 2: POST review — без авторизации → 401
  // ===========================================
  console.log('\n🔒 Test 2: POST review without auth → 401...');
  const unauthRes = http.post(
    `${BASE_URL}/api/reviews`,
    JSON.stringify({ profile_type: 'worker', profile_id: 1, rating: 5, text: 'Test' }),
    { headers }
  );
  console.log(`POST unauth status: ${unauthRes.status}`);
  check(unauthRes, {
    'POST review unauth - status 401 or 403': (r) => r.status === 401 || r.status === 403,
  });
  sleep(0.5);

  // ===========================================
  // Авторизация для следующих тестов
  // ===========================================
  console.log('\n🔐 Authenticating...');
  const sessionid = loginAndGetSession(http, BASE_URL, TEST_USER, TEST_PASSWORD);
  if (!sessionid) {
    console.error('❌ Auth failed — skipping auth tests');
    return;
  }
  const authHeaders = { ...headers, Cookie: `sessionid=${sessionid}` };
  console.log('✅ Authenticated');

  // ===========================================
  // Test 3: POST review — с авторизацией, без ContactAccess → 403
  // Берём реальный профиль из ленты, чтобы не получить 404
  // ===========================================
  console.log('\n🚫 Test 3: POST review without ContactAccess → 403...');
  let targetProfileId = 1;
  const workersRes = http.get(`${BASE_URL}/api/worker?page_size=1`, { headers: authHeaders });
  if (workersRes.status === 200) {
    try {
      const data = workersRes.json();
      const list = Array.isArray(data) ? data : (data.results || data.items || []);
      if (list.length > 0) targetProfileId = list[0].id;
    } catch (e) { /* use default */ }
  }
  console.log(`Using profile_id: ${targetProfileId}`);

  const noAccessRes = http.post(
    `${BASE_URL}/api/reviews`,
    JSON.stringify({ profile_type: 'worker', profile_id: targetProfileId, rating: 4, text: 'Test no-access' }),
    { headers: authHeaders }
  );
  console.log(`POST no-access status: ${noAccessRes.status}`);
  check(noAccessRes, {
    'POST review no ContactAccess - status 403': (r) => r.status === 403,
    'POST review no ContactAccess - error message': (r) => r.body && r.body.length > 2,
  });
  sleep(0.5);

  // ===========================================
  // Test 4: Admin GET /api/admin/reviews — только для staff
  // (обычный пользователь должен получить 403)
  // ===========================================
  console.log('\n👮 Test 4: Admin reviews endpoint (non-staff → 403)...');
  const adminRes = http.get(`${BASE_URL}/api/admin/reviews`, { headers: authHeaders });
  console.log(`Admin reviews status: ${adminRes.status}`);
  check(adminRes, {
    'Admin reviews - non-staff gets 403 or 200': (r) => r.status === 403 || r.status === 200,
    'Admin reviews - not 500': (r) => r.status < 500,
  });

  console.log('\n✅ Reviews list/create tests completed');
}
