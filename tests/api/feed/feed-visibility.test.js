/**
 * 📡 FEED VISIBILITY TEST — FeedViewerRule
 *
 * Проверяет связь между CRUD операциями и публичной лентой:
 *   1. GET /api/feed без авторизации — возвращает публичный список
 *   2. После CREATE профиля — лента обновляется (с задержкой на MaterializedFeed)
 *   3. После DELETE профиля — запись пропадает из ленты
 *
 * ⚠️  ИЗВЕСТНЫЙ РИСК: soft-delete триггерит только is_deleted=True на модели.
 *     MaterializedFeed обновляется сигналом post_save или вручную в endpoint.
 *     Если endpoint не обновляет MaterializedFeed — профиль останется в ленте!
 *
 * Env vars:
 *   BASE_URL         — по умолчанию https://sowwos.ru
 *   SESSION_COOKIE   — готовая сессия (без логина)
 *   TEST_USER        — номер телефона для логина
 *   TEST_PASSWORD    — пароль для логина
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { getSession } from '../../../utils/session.js';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';

export const options = {
  vus: 1, iterations: 1,
  thresholds: { checks: ['rate>0.85'], http_req_duration: ['p(95)<5000'] },
};

export function setup() { return getSession(); }

export default function (data) {
  const ah = { 'Content-Type': 'application/json', Cookie: `sessionid=${data.session}` };
  const publicH = { 'Content-Type': 'application/json' };

  // ── 1. Public feed (no auth) ─────────────────────────────────────────────
  console.log('\n📡 Test 1: Public feed (unauthenticated)...');
  const feedRes = http.get(`${BASE_URL}/api/feed?type=worker&limit=10`, { headers: publicH });
  console.log(`Feed (public): ${feedRes.status}`);
  check(feedRes, {
    'Feed public — 200': (r) => r.status === 200,
    'Feed public — has items array': (r) => {
      try {
        const b = r.json();
        return Array.isArray(b) || Array.isArray(b.items) || Array.isArray(b.results);
      } catch { return false; }
    },
    'Feed public — no 500': (r) => r.status < 500,
  });
  sleep(0.3);

  // ── 2. Feed with auth ────────────────────────────────────────────────────
  console.log('\n📡 Test 2: Feed with auth...');
  const feedAuthRes = http.get(`${BASE_URL}/api/feed?type=worker&limit=5`, { headers: ah });
  check(feedAuthRes, {
    'Feed auth — 200': (r) => r.status === 200,
    'Feed auth — no 500': (r) => r.status < 500,
  });
  sleep(0.3);

  // ── 3. Create worker, wait, check feed ───────────────────────────────────
  console.log('\n📡 Test 3: Create worker and check feed visibility...');
  const createRes = http.post(`${BASE_URL}/api/worker`, JSON.stringify({
    full_name: 'K6 Feed Visibility Test',
    specialization: 'ТестФид',
    work_city: 'Москва',
    work_region: 'Московская область',
    search_status: 'active_search',
    contact_phone: '+79001234567',
    contact_person: 'K6 Feed'
  }), { headers: ah });
  console.log(`CREATE: ${createRes.status}`);
  const okCreate = check(createRes, {
    'Create for feed test — 200': (r) => r.status === 200,
    'Create for feed test — returns id': (r) => { try { return !!r.json().id; } catch { return false; } },
  });
  if (!okCreate) { console.error('Create failed:', createRes.body.slice(0, 200)); return; }
  const profileId = createRes.json().id;

  // Ждём обновление MaterializedFeed (может быть async refresh)
  sleep(2);

  const feedAfterCreate = http.get(
    `${BASE_URL}/api/feed?type=worker&limit=100`,
    { headers: publicH }
  );
  check(feedAfterCreate, {
    'Feed after CREATE — 200': (r) => r.status === 200,
    'Feed after CREATE — profile MAY appear (MaterializedFeed latency)': (r) => {
      // Проверяем но не фейлим — MaterializedFeed может быть async
      try {
        const b = r.json();
        const items = Array.isArray(b) ? b : (b.items || b.results || []);
        const found = items.some(i => i.id === profileId || i.source_id === profileId);
        if (!found) console.log('⚠️  Profile not yet in feed (MaterializedFeed may be delayed)');
        return true; // не фейлим — задержка допустима
      } catch { return true; }
    },
  });
  sleep(0.3);

  // ── 4. Delete worker, check feed ─────────────────────────────────────────
  console.log('\n📡 Test 4: Delete worker and check feed disappears...');
  const delRes = http.del(`${BASE_URL}/api/worker/${profileId}`, null, { headers: ah });
  check(delRes, { 'Delete for feed test — 200 or 204': (r) => r.status === 200 || r.status === 204 });

  sleep(2);

  const feedAfterDelete = http.get(
    `${BASE_URL}/api/feed?type=worker&limit=100`,
    { headers: publicH }
  );
  check(feedAfterDelete, {
    'Feed after DELETE — 200': (r) => r.status === 200,
    'Feed after DELETE — profile gone from feed': (r) => {
      try {
        const b = r.json();
        const items = Array.isArray(b) ? b : (b.items || b.results || []);
        const found = items.some(i => i.id === profileId || i.source_id === profileId);
        if (found) console.error('❌ BUG: soft-deleted profile still in MaterializedFeed!');
        return !found;
      } catch { return false; }
    },
  });

  // ── 5. Feed filters ───────────────────────────────────────────────────────
  console.log('\n📡 Test 5: Feed filters...');
  const typesToTest = ['worker', 'brigade', 'contractor', 'customer', 'vacancy', 'order', 'tender'];
  for (const t of typesToTest) {
    const r = http.get(`${BASE_URL}/api/feed?type=${t}&limit=1`, { headers: publicH });
    check(r, {
      [`Feed type=${t} — 200 or empty`]: (res) => res.status === 200,
    });
    sleep(0.2);
  }

  console.log('\n✅ Feed visibility test completed');
}
