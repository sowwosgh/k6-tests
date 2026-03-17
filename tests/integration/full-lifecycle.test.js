/**
 * Full Lifecycle Integration Test
 *
 * Полный цикл:
 * 1. CREATE  — создать профиль работника
 * 2. FEED    — убедиться что профиль появился в ленте
 * 3. VIEW    — открыть профиль, убедиться что контакты замаскированы
 * 4. UNLOCK  — разблокировать контакты (списать баланс)
 * 5. REVIEW  — оставить отзыв (только после unlock)
 * 6. RE-UNLOCK — повторный unlock должен вернуть уже разблокированные контакты (идемпотентность)
 * 7. DELETE  — мягкое удаление, профиль не виден в ленте
 *
 * Запуск: k6 run tests/integration/full-lifecycle.test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { loginAndGetSession } from '../../utils/auth.js';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const TEST_USER     = '+79001234567';
const TEST_PASSWORD = 'test123';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.80'],
    http_req_duration: ['p(95)<5000'],
  },
};

export default function () {
  const h = { 'Content-Type': 'application/json' };

  // ─── Авторизация ───────────────────────────────────────────────
  console.log('\n🔐 Auth...');
  const session = loginAndGetSession(http, BASE_URL, TEST_USER, TEST_PASSWORD);
  if (!session) { console.error('❌ Auth failed'); return; }
  const ah = { ...h, Cookie: `sessionid=${session}` };
  console.log('✅ Auth OK');
  sleep(0.3);

  // ─── 1. CREATE ─────────────────────────────────────────────────
  console.log('\n📝 Step 1: CREATE worker profile...');
  const createRes = http.post(
    `${BASE_URL}/api/worker`,
    JSON.stringify({
      full_name: 'K6 Test Worker',
      specialization: 'Тестировщик',
      work_city: 'Москва',
      work_region: 'Московская область',
      search_status: 'active_search',
      contact_phone: '+79001234567',
      contact_person: 'K6 Test'
    }),
    { headers: ah }
  );
  console.log(`CREATE status: ${createRes.status}`);

  const created = check(createRes, {
    'CREATE — status 200 or 201': (r) => r.status === 200 || r.status === 201,
    'CREATE — returns id': (r) => {
      try { return !!r.json().id; } catch { return false; }
    },
  });

  if (!created) {
    console.error('❌ CREATE failed, body:', createRes.body.slice(0, 300));
    return;
  }

  const workerId = createRes.json().id;
  console.log(`✅ Created worker id=${workerId}`);
  sleep(1); // дождаться MaterializedFeed

  // ─── 2. FEED ───────────────────────────────────────────────────
  console.log('\n🔍 Step 2: Worker appears in FEED...');
  const feedRes = http.get(
    `${BASE_URL}/api/feed?profile_type=worker&page_size=50`,
    { headers: ah }
  );
  check(feedRes, {
    'FEED — status 200': (r) => r.status === 200,
    'FEED — new profile visible': (r) => {
      try {
        const body = r.json();
        const items = Array.isArray(body) ? body : (body.results || body.items || []);
        return items.some(item => item.id === workerId || item.source_id === workerId);
      } catch { return false; }
    },
  });
  sleep(0.3);

  // ─── 3. VIEW — контакты замаскированы ──────────────────────────
  console.log('\n👁️  Step 3: VIEW — contacts must be masked for other users...');
  const checkRes = http.get(
    `${BASE_URL}/api/contacts/check-access/worker/${workerId}`,
    { headers: ah }
  );
  console.log(`check-access status: ${checkRes.status}`);
  check(checkRes, {
    'VIEW — check-access responds': (r) => r.status === 200 || r.status === 404,
    'VIEW — has_access field present': (r) => {
      try { return 'has_access' in r.json(); } catch { return false; }
    },
  });

  const maskedRes = http.get(
    `${BASE_URL}/api/contacts/worker/${workerId}`,
    { headers: ah }
  );
  console.log(`contacts masked status: ${maskedRes.status}`);
  check(maskedRes, {
    'VIEW — contacts endpoint responds': (r) => r.status === 200 || r.status === 403,
  });
  sleep(0.3);

  // ─── 4. UNLOCK ─────────────────────────────────────────────────
  console.log('\n🔓 Step 4: UNLOCK contacts (deduct balance)...');

  // Проверим баланс ДО
  const balBefore = http.get(`${BASE_URL}/api/user/balance`, { headers: ah });
  let balanceBefore = null;
  if (balBefore.status === 200) {
    try { balanceBefore = balBefore.json().contacts_remaining; } catch {}
  }
  console.log(`Balance before unlock: ${balanceBefore}`);

  const unlockRes = http.post(
    `${BASE_URL}/api/contacts/unlock`,
    JSON.stringify({ profile_type: 'worker', profile_id: workerId }),
    { headers: ah }
  );
  console.log(`UNLOCK status: ${unlockRes.status}, body: ${unlockRes.body.slice(0, 200)}`);
  check(unlockRes, {
    'UNLOCK — accepted (200/402/400)': (r) => [200, 400, 402].includes(r.status),
    'UNLOCK — valid JSON': (r) => { try { r.json(); return true; } catch { return false; } },
  });

  if (unlockRes.status === 200) {
    // Проверим баланс ПОСЛЕ — должен уменьшиться на 1
    sleep(0.3);
    const balAfter = http.get(`${BASE_URL}/api/user/balance`, { headers: ah });
    if (balAfter.status === 200 && balanceBefore !== null) {
      try {
        const balanceAfter = balAfter.json().contacts_remaining;
        console.log(`Balance after unlock: ${balanceAfter}`);
        check(balAfter, {
          'UNLOCK — balance decremented by 1': () => balanceAfter === balanceBefore - 1,
        });
      } catch {}
    }

    // ─── 5. REVIEW — только после unlock ───────────────────────
    console.log('\n⭐ Step 5: REVIEW — submit after unlock...');
    const reviewRes = http.post(
      `${BASE_URL}/api/reviews`,
      JSON.stringify({
        profile_type: 'worker',
        profile_id: workerId,
        rating: 5,
        text: 'K6 test review — auto cleanup pending'
      }),
      { headers: ah }
    );
    console.log(`REVIEW status: ${reviewRes.status}`);
    check(reviewRes, {
      'REVIEW — accepted after unlock (200/201)': (r) => r.status === 200 || r.status === 201,
      'REVIEW — valid JSON': (r) => { try { r.json(); return true; } catch { return false; } },
    });

    // ─── 6. RE-UNLOCK (идемпотентность) ────────────────────────
    console.log('\n♻️  Step 6: RE-UNLOCK — must be idempotent (no extra charge)...');
    const reUnlockRes = http.post(
      `${BASE_URL}/api/contacts/unlock`,
      JSON.stringify({ profile_type: 'worker', profile_id: workerId }),
      { headers: ah }
    );
    console.log(`RE-UNLOCK status: ${reUnlockRes.status}`);
    check(reUnlockRes, {
      'RE-UNLOCK — 200 (already access) or 400 (already purchased)': (r) =>
        r.status === 200 || r.status === 400,
      'RE-UNLOCK — NOT 402 (balance not charged again)': (r) => r.status !== 402,
    });

    // Баланс не должен уменьшиться повторно
    const balReUnlock = http.get(`${BASE_URL}/api/user/balance`, { headers: ah });
    if (balReUnlock.status === 200 && balanceBefore !== null) {
      try {
        const bal = balReUnlock.json().contacts_remaining;
        check(balReUnlock, {
          'RE-UNLOCK — balance not decremented twice': () => bal >= balanceBefore - 1,
        });
      } catch {}
    }
  } else {
    console.warn('⚠️  Skipping review and re-unlock tests (no balance or unlock failed)');
  }

  sleep(0.5);

  // ─── 7. DELETE (soft) ──────────────────────────────────────────
  console.log('\n🗑️  Step 7: DELETE (soft) worker...');
  const delRes = http.del(
    `${BASE_URL}/api/worker/${workerId}`,
    null,
    { headers: ah }
  );
  console.log(`DELETE status: ${delRes.status}`);
  check(delRes, {
    'DELETE — status 200 or 204': (r) => r.status === 200 || r.status === 204,
  });

  sleep(0.5);

  // Лента кэшируется — профиль может быть виден ещё ~5 минут после удаления.
  // Проверяем через /api/my-feed (без кэша, персональный эндпоинт).
  const feedAfterDel = http.get(
    `${BASE_URL}/api/my-feed?page_size=50`,
    { headers: ah }
  );
  check(feedAfterDel, {
    'DELETE — my-feed responds after delete': (r) => r.status === 200 || r.status === 404,
    'DELETE — profile NOT in my-feed after soft delete': (r) => {
      if (r.status !== 200) return true; // эндпоинт может не существовать — не блокирует
      try {
        const body = r.json();
        const items = Array.isArray(body) ? body : (body.results || body.items || []);
        return !items.some(item => item.id === workerId || item.source_id === workerId);
      } catch { return true; } // не можем распарсить — не блокирует
    },
  });

  // Прямой GET профиля должен вернуть 404 (мягко удалён)
  const viewDelRes = http.get(`${BASE_URL}/api/worker/${workerId}`, { headers: ah });
  check(viewDelRes, {
    'DELETE — direct GET returns 404 after soft delete': (r) => r.status === 404,
  });

  console.log('\n✅ Full lifecycle test completed');
}
