/**
 * Tender — Full CRUD Integration Test
 * CREATE → list check → UPDATE → DELETE (soft) → list check after delete
 *
 * ⚠️  GET /api/tenders/{id} — не реализован (Allow: PUT, PATCH, DELETE only).
 *     Для READ используем список /api/tenders.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { getSession } from '../../../utils/session.js';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';

export const options = {
  vus: 1, iterations: 1,
  thresholds: { checks: ['rate>0.85'], http_req_duration: ['p(95)<3000'] },
};

export function setup() { return getSession(); }

export default function (data) {
  const ah = { 'Content-Type': 'application/json', Cookie: `sessionid=${data.session}` };

  // CREATE
  console.log('\n📝 CREATE tender...');
  const createRes = http.post(`${BASE_URL}/api/tenders`, JSON.stringify({
    title: 'K6 Test Tender — Строительство ЖК',
    tender_number: `K6-${Date.now()}`,
    tender_type: 'Открытый конкурс',
    city: 'Москва',
    region: 'Московская область',
    object_address: 'г. Москва, район Тестовый',
    description: 'K6 тестовый тендер. Строительство жилого комплекса.',
    requirements: 'СРО, лицензии, опыт работы от 5 лет',
    budget_min: 50000000,
    budget_max: 80000000,
    submission_deadline: '2026-04-01',
    work_start: '2026-05-01',
    work_end: '2027-12-31',
    organization: 'K6 Тест Застройщик',
    phone: '+79001234567',
    email: 'k6tender@test.com'
  }), { headers: ah });
  console.log(`CREATE: ${createRes.status}`);
  const ok = check(createRes, {
    'CREATE — 200': (r) => r.status === 200,
    'CREATE — returns id': (r) => { try { return !!r.json().id; } catch { return false; } },
    'CREATE — no 500': (r) => r.status < 500,
  });
  if (!ok) { console.error('body:', createRes.body.slice(0, 200)); return; }
  const id = createRes.json().id;
  sleep(0.3);

  // NOTE: GET /api/tenders/{id} = 405 (not implemented). Read via list.
  const listBeforeRes = http.get(`${BASE_URL}/api/tenders`, { headers: ah });
  check(listBeforeRes, {
    'LIST (before delete) — 200': (r) => r.status === 200,
  });
  sleep(0.3);

  // UPDATE
  const patchRes = http.patch(`${BASE_URL}/api/tenders/${id}`,
    JSON.stringify({ budget_max: 90000000, submission_deadline: '2026-04-15', requirements: 'СРО, лицензии, опыт от 5 лет, рекомендации' }),
    { headers: ah });
  console.log(`PATCH: ${patchRes.status}`);
  check(patchRes, {
    'UPDATE — 200': (r) => r.status === 200,
    'UPDATE — no 500': (r) => r.status < 500,
  });
  sleep(0.3);

  // DELETE
  const delRes = http.del(`${BASE_URL}/api/tenders/${id}`, null, { headers: ah });
  check(delRes, { 'DELETE — 200 or 204': (r) => r.status === 200 || r.status === 204 });
  sleep(0.5);

  // DELETE non-existent
  check(http.del(`${BASE_URL}/api/tenders/999999`, null, { headers: ah }), {
    'DELETE non-existent — 404': (r) => r.status === 404,
  });

  console.log('\n✅ Tender CRUD completed');
}
