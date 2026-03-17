/**
 * 🔒 ACCESS CONTROL TEST — MyProfilesFormRule + QuickCreateFormRule
 *
 * Проверяет что пользователь B не может редактировать/удалять профили пользователя A.
 * Ожидаемый ответ: 403 Forbidden.
 *
 * Сценарий:
 *   1. User A создаёт worker-профиль
 *   2. User B (другой аккаунт) пытается PATCH / DELETE его
 *   3. Оба запроса должны вернуть 403 (или 404 если бэкенд скрывает объект)
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { loginAndGetSession } from '../../../utils/auth.js';

const BASE_URL  = __ENV.BASE_URL   || 'https://sowwos.ru';
const USER_A    = __ENV.USER_A     || '+79001234567';
const PASS_A    = __ENV.PASS_A     || 'test123';
const USER_B    = __ENV.USER_B     || '+79007654321'; // второй тест-пользователь
const PASS_B    = __ENV.PASS_B     || 'test123';

export const options = {
  vus: 1, iterations: 1,
  thresholds: { checks: ['rate>0.85'], http_req_duration: ['p(95)<3000'] },
};

export default function () {
  const h = { 'Content-Type': 'application/json' };

  // ── Auth User A ──────────────────────────────────────────────────────────
  console.log('\n🔐 Auth User A...');
  const sessA = loginAndGetSession(http, BASE_URL, USER_A, PASS_A);
  if (!sessA) { console.error('❌ User A auth failed'); return; }
  const ahA = { ...h, Cookie: `sessionid=${sessA}` };

  // ── User A creates a worker profile ──────────────────────────────────────
  const createRes = http.post(`${BASE_URL}/api/worker`, JSON.stringify({
    full_name: 'K6 AccessControl Owner',
    specialization: 'Тест',
    work_city: 'Москва',
    work_region: 'Московская область',
    search_status: 'active_search',
    contact_phone: '+79001234567',
    contact_person: 'K6 Test'
  }), { headers: ahA });

  const ok = check(createRes, {
    'Setup: User A CREATE — 200': (r) => r.status === 200,
  });
  if (!ok) { console.error('Setup failed, body:', createRes.body.slice(0, 200)); return; }
  const profileId = createRes.json().id;
  console.log(`✅ User A created worker profile id=${profileId}`);
  sleep(0.3);

  // ── Auth User B ──────────────────────────────────────────────────────────
  console.log('\n🔐 Auth User B...');
  const sessB = loginAndGetSession(http, BASE_URL, USER_B, PASS_B);
  if (!sessB) {
    console.warn('⚠️ User B auth failed — skipping cross-user checks (second test account not configured)');
    // Cleanup
    http.del(`${BASE_URL}/api/worker/${profileId}`, null, { headers: ahA });
    return;
  }
  const ahB = { ...h, Cookie: `sessionid=${sessB}` };

  // ── User B tries to PATCH User A's profile ───────────────────────────────
  console.log('\n🚫 User B attempts PATCH on User A profile...');
  const patchRes = http.patch(
    `${BASE_URL}/api/worker/${profileId}`,
    JSON.stringify({ search_status: 'not_available' }),
    { headers: ahB }
  );
  console.log(`PATCH by B: ${patchRes.status}`);
  check(patchRes, {
    'Security: User B PATCH → 403 or 404': (r) => r.status === 403 || r.status === 404,
  });

  // ── User B tries to DELETE User A's profile ──────────────────────────────
  console.log('\n🚫 User B attempts DELETE on User A profile...');
  const delRes = http.del(`${BASE_URL}/api/worker/${profileId}`, null, { headers: ahB });
  console.log(`DELETE by B: ${delRes.status}`);
  check(delRes, {
    'Security: User B DELETE → 403 or 404': (r) => r.status === 403 || r.status === 404,
  });

  // ── Verify profile still exists (User B could not delete it) ─────────────
  const verifyRes = http.get(`${BASE_URL}/api/worker/${profileId}`, { headers: ahA });
  check(verifyRes, {
    'Security: profile still exists after User B attempt': (r) => r.status === 200,
  });

  // ── Cleanup: User A deletes own profile ──────────────────────────────────
  const cleanupRes = http.del(`${BASE_URL}/api/worker/${profileId}`, null, { headers: ahA });
  check(cleanupRes, { 'Cleanup: User A DELETE own profile — ok': (r) => r.status === 200 || r.status === 204 });

  console.log('\n✅ Access control test completed');
}
