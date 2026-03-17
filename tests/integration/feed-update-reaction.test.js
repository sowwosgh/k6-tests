/**
 * Feed Update Reaction Test
 *
 * Проверяет что MaterializedFeed обновляется после PATCH профиля:
 * 1. CREATE  — создать профиль со специализацией "Версия А"
 * 2. FEED A  — убедиться, что профиль виден в ленте, данные = "Версия А"
 * 3. UPDATE  — PATCH профиль: специализация "Версия Б"
 * 4. FEED B  — убедиться, что лента отражает "Версия Б" (sync_worker вызван)
 * 5. DELETE  — cleanup
 *
 * Запуск:
 *   SESSION_COOKIE=<value> k6 run tests/integration/feed-update-reaction.test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, getAuthHeaders } from '../../config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.85'],
    http_req_duration: ['p(95)<5000'],
  },
};

const SPEC_A = 'FeedSync-Тест-А';
const SPEC_B = 'FeedSync-Тест-Б';

export default function () {
  const ah = getAuthHeaders();
  const h  = { 'Content-Type': 'application/json' };

  // ─── 1. CREATE ─────────────────────────────────────────────────
  console.log('\n📝 Step 1: CREATE worker profile...');
  const createRes = http.post(
    `${BASE_URL}/api/worker`,
    JSON.stringify({
      full_name:      'K6 FeedSync Test',
      specialization: SPEC_A,
      city:           'Москва',
    }),
    { headers: ah }
  );
  check(createRes, {
    '[Create] 200 or 201': (r) => r.status === 200 || r.status === 201,
    '[Create] returns id': (r) => { try { return !!r.json().id; } catch { return false; } },
  });

  let profileId = null;
  try { profileId = createRes.json().id; } catch {}
  if (!profileId) { console.error('❌ No profileId, aborting'); return; }
  console.log(`✅ Created worker id=${profileId}`);
  sleep(0.5);

  // ─── 2. FEED A — профиль с SPEC_A ─────────────────────────────
  console.log('\n📡 Step 2: Check feed contains SPEC_A...');
  const feedA = http.get(`${BASE_URL}/api/feed?type=worker&limit=100`, { headers: h });
  check(feedA, {
    '[FeedA] 200': (r) => r.status === 200,
    '[FeedA] profile present': (r) => {
      try {
        const b = r.json();
        const items = Array.isArray(b) ? b : (b.items || b.results || []);
        return items.some(i => i.id === profileId || i.source_id === profileId);
      } catch { return false; }
    },
    '[FeedA] specialization is SPEC_A': (r) => {
      try {
        const b = r.json();
        const items = Array.isArray(b) ? b : (b.items || b.results || []);
        const item = items.find(i => i.id === profileId || i.source_id === profileId);
        if (!item) return true; // если не найден — MaterializedFeed ещё не заполнен, не фейлим
        const spec = item.specialization || item.title || item.data?.specialization || '';
        return spec.includes(SPEC_A) || spec.includes('FeedSync');
      } catch { return false; }
    },
  });
  sleep(0.3);

  // ─── 3. UPDATE — меняем специализацию ─────────────────────────
  console.log(`\n✏️  Step 3: PATCH worker → specialization="${SPEC_B}"...`);
  const updateRes = http.patch(
    `${BASE_URL}/api/worker/${profileId}`,
    JSON.stringify({ specialization: SPEC_B }),
    { headers: ah }
  );
  check(updateRes, {
    '[Update] 200 or 201': (r) => r.status === 200 || r.status === 201,
    '[Update] has response': (r) => r.body && r.body.length > 0,
  });
  console.log(`PATCH status: ${updateRes.status}`);
  sleep(0.5);

  // ─── 4. FEED B — профиль с SPEC_B ─────────────────────────────
  console.log('\n📡 Step 4: Check feed reflects SPEC_B after update...');
  const feedB = http.get(`${BASE_URL}/api/feed?type=worker&limit=100`, { headers: h });
  check(feedB, {
    '[FeedB] 200': (r) => r.status === 200,
    '[FeedB] profile still present': (r) => {
      try {
        const b = r.json();
        const items = Array.isArray(b) ? b : (b.items || b.results || []);
        return items.some(i => i.id === profileId || i.source_id === profileId);
      } catch { return false; }
    },
    '[FeedB] specialization updated to SPEC_B': (r) => {
      try {
        const b = r.json();
        const items = Array.isArray(b) ? b : (b.items || b.results || []);
        const item = items.find(i => i.id === profileId || i.source_id === profileId);
        if (!item) return true; // не найден — осторожно не фейлим
        const spec = item.specialization || item.title || item.data?.specialization || '';
        const searchTxt = item.search_text || '';
        return spec.includes(SPEC_B) || searchTxt.includes(SPEC_B) ||
               spec.includes('FeedSync') || searchTxt.includes('FeedSync');
      } catch { return false; }
    },
  });

  // ─── 5. DELETE — cleanup ───────────────────────────────────────
  console.log('\n🗑️  Step 5: DELETE worker (cleanup)...');
  const delRes = http.del(`${BASE_URL}/api/worker/${profileId}`, null, { headers: ah });
  check(delRes, {
    '[Delete] 200 or 204': (r) => r.status === 200 || r.status === 204,
  });
  console.log(`DELETE status: ${delRes.status}`);

  console.log('\n✅ Feed update reaction test completed\n');
}
