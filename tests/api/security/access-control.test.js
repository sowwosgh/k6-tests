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
 *
 * Env vars (два варианта запуска):
 *
 *   Вариант 1 — через логин (ждать 60 мин между запусками из-за rate-limit):
 *     USER_A / PASS_A / USER_B / PASS_B
 *
 *   Вариант 2 — готовые сессии (взять из DevTools → Application → Cookies):
 *     SESSION_COOKIE_A=<sessionid пользователя A>
 *     SESSION_COOKIE_B=<sessionid пользователя B>
 *
 *   k6 run \
 *     -e SESSION_COOKIE_A="abc..." \
 *     -e SESSION_COOKIE_B="xyz..." \
 *     tests/api/security/access-control.test.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { loginAndGetSession } from '../../../utils/auth.js';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';

function resolveSession(cookieEnv, userEnv, passEnv) {
  const cookie = __ENV[cookieEnv];
  if (cookie) return cookie;
  const user = __ENV[userEnv];
  const pass = __ENV[passEnv];
  if (user && pass) return loginAndGetSession(http, BASE_URL, user, pass);
  return null;
}

export const options = {
  vus: 1, iterations: 1,
  thresholds: { checks: ['rate>0.85'], http_req_duration: ['p(95)<3000'] },
};

export function setup() {
  const sessA = resolveSession('SESSION_COOKIE_A', 'USER_A', 'PASS_A');
  if (!sessA) throw new Error('User A session not available. Set SESSION_COOKIE_A or USER_A+PASS_A');
  const sessB = resolveSession('SESSION_COOKIE_B', 'USER_B', 'PASS_B');
  return { sessA, sessB };
}

export default function (data) {
  const h = { 'Content-Type': 'application/json' };
  const ahA = { ...h, Cookie: `sessionid=${data.sessA}` };

  // ── User A creates a worker profile ──────────────────────────────────────
  console.log('\n📝 User A creates worker profile...');
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
  if (!ok) { console.error('Setup failed:', createRes.body.slice(0, 200)); return; }
  const profileId = createRes.json().id;
  console.log(`✅ User A profile id=${profileId}`);
  sleep(0.3);

  // ── Skip if User B not available ─────────────────────────────────────────
  if (!data.sessB) {
    console.warn('⚠️ User B session not available — skipping cross-user checks');
    console.warn('   Set SESSION_COOKIE_B=<sessionid> or USER_B+PASS_B env vars');
    http.del(`${BASE_URL}/api/worker/${profileId}`, null, { headers: ahA });
    return;
  }

  const ahB = { ...h, Cookie: `sessionid=${data.sessB}` };

  // ── User B tries to PATCH User A's profile ───────────────────────────────
  console.log('\n🚫 User B → PATCH User A profile...');
  const patchRes = http.patch(
    `${BASE_URL}/api/worker/${profileId}`,
    JSON.stringify({ search_status: 'not_available' }),
    { headers: ahB }
  );
  console.log(`PATCH by B: ${patchRes.status}`);
  check(patchRes, {
    'Security: User B PATCH → 403 or 404': (r) => r.status === 403 || r.status === 404,
  });
  sleep(0.3);

  // ── User B tries to DELETE User A's profile ──────────────────────────────
  console.log('\n🚫 User B → DELETE User A profile...');
  const delRes = http.del(`${BASE_URL}/api/worker/${profileId}`, null, { headers: ahB });
  console.log(`DELETE by B: ${delRes.status}`);
  check(delRes, {
    'Security: User B DELETE → 403 or 404': (r) => r.status === 403 || r.status === 404,
  });
  sleep(0.3);

  // ── Profile must still exist (User B failed) ──────────────────────────────
  const verifyRes = http.get(`${BASE_URL}/api/worker/${profileId}`, { headers: ahA });
  check(verifyRes, {
    'Security: profile intact after User B attempt': (r) => r.status === 200,
  });
  sleep(0.3);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const cleanupRes = http.del(`${BASE_URL}/api/worker/${profileId}`, null, { headers: ahA });
  check(cleanupRes, { 'Cleanup: User A deletes own profile': (r) => r.status === 200 || r.status === 204 });

  console.log('\n✅ Access control test completed');
}
