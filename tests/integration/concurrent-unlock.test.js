/**
 * Concurrent Unlock Race Condition Test
 *
 * Проверяет что два одновременных unlock одного и того же профиля
 * НЕ спишут баланс дважды (race condition / double-spend).
 *
 * Запуск: k6 run tests/integration/concurrent-unlock.test.js
 *
 * Логика:
 * - 2 VU одновременно посылают POST /api/contacts/unlock для одного profile_id
 * - Суммарное списание должно быть не более 1 (идемпотентность / unique constraint)
 * - Оба запроса должны вернуть 200 или 400, но не 500
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { loginAndGetSession } from '../../utils/auth.js';

const BASE_URL     = __ENV.BASE_URL     || 'https://sowwos.ru';
const TEST_USER    = '+79001234567';
const TEST_PASSWORD = 'test123';
// Профиль, который точно существует — можно передать через env
const TARGET_WORKER_ID = __ENV.TARGET_WORKER_ID || '1';

export const options = {
  // 2 виртуальных пользователя стартуют одновременно
  vus: 2,
  iterations: 2,
  thresholds: {
    checks: ['rate>0.75'],
    http_req_duration: ['p(95)<5000'],
    // Критично: ни один запрос не должен вернуть 500
    http_req_failed: ['rate<0.5'],
  },
};

// Глобальный счётчик успешных unlock (shared state через __ENV — нет в k6,
// поэтому каждый VU логирует своё, анализируем вручную по выводу)

export default function () {
  const h = { 'Content-Type': 'application/json' };

  const session = loginAndGetSession(http, BASE_URL, TEST_USER, TEST_PASSWORD);
  if (!session) { console.error(`VU${__VU}: ❌ Auth failed`); return; }
  const ah = { ...h, Cookie: `sessionid=${session}` };

  // Баланс ДО
  const balBefore = http.get(`${BASE_URL}/api/user/balance`, { headers: ah });
  let balance = null;
  if (balBefore.status === 200) {
    try { balance = balBefore.json().contacts_remaining; } catch {}
  }
  console.log(`VU${__VU}: balance before = ${balance}`);

  // Одновременный unlock (оба VU посылают без sleep)
  console.log(`VU${__VU}: 🔓 firing unlock for worker=${TARGET_WORKER_ID}...`);
  const res = http.post(
    `${BASE_URL}/api/contacts/unlock`,
    JSON.stringify({ profile_type: 'worker', profile_id: parseInt(TARGET_WORKER_ID) }),
    { headers: ah }
  );
  console.log(`VU${__VU}: status=${res.status} body=${res.body.slice(0, 200)}`);

  check(res, {
    [`VU${__VU} unlock — not 500`]: (r) => r.status < 500,
    [`VU${__VU} unlock — valid response (200/400/402)`]: (r) =>
      [200, 400, 402].includes(r.status),
    [`VU${__VU} unlock — valid JSON`]: (r) => {
      try { r.json(); return true; } catch { return false; }
    },
  });

  sleep(1); // дождаться завершения обоих запросов

  // Баланс ПОСЛЕ — каждый VU проверяет свой баланс
  // Если оба VU — один пользователь, то баланс должен уменьшиться ровно на 1, не на 2
  const balAfter = http.get(`${BASE_URL}/api/user/balance`, { headers: ah });
  if (balAfter.status === 200 && balance !== null) {
    try {
      const newBalance = balAfter.json().contacts_remaining;
      console.log(`VU${__VU}: balance after = ${newBalance}, delta = ${balance - newBalance}`);
      check(balAfter, {
        [`VU${__VU} — balance dropped by at most 1 (no double-charge)`]: () =>
          balance - newBalance <= 1,
      });
    } catch {}
  }
}
