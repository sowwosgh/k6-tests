/**
 * Vacancy — Full CRUD Integration Test
 * CREATE → READ → UPDATE → DELETE (soft) → 404
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
  console.log('\n📝 CREATE vacancy...');
  const createRes = http.post(`${BASE_URL}/api/vacancy`, JSON.stringify({
    title: 'K6 Test Vacancy',
    company_name: 'K6 Test Company',
    city: 'Москва',
    specialization: 'Тестировщик',
    description: 'K6 тестовая вакансия',
    salary_min: 100000,
    salary_max: 150000,
    phone: '+79001234567',
    is_active: true
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

  // READ
  const readRes = http.get(`${BASE_URL}/api/vacancy/${id}`, { headers: ah });
  check(readRes, {
    'READ — 200': (r) => r.status === 200,
    'READ — title matches': (r) => { try { return r.json().title === 'K6 Test Vacancy'; } catch { return false; } },
  });
  sleep(0.3);

  // UPDATE
  const patchRes = http.patch(`${BASE_URL}/api/vacancy/${id}`,
    JSON.stringify({ salary_min: 90000, salary_max: 140000, employment_type: 'remote' }),
    { headers: ah });
  console.log(`PATCH: ${patchRes.status}`);
  check(patchRes, {
    'UPDATE — 200': (r) => r.status === 200,
    'UPDATE — no 500': (r) => r.status < 500,
  });
  sleep(0.3);

  // DELETE
  const delRes = http.del(`${BASE_URL}/api/vacancy/${id}`, null, { headers: ah });
  check(delRes, {
    'DELETE — 200 or 204': (r) => r.status === 200 || r.status === 204,
    'DELETE — ok: true': (r) => { try { return r.json().ok === true; } catch { return true; } },
  });
  sleep(0.5);

  // 404 AFTER DELETE
  check(http.get(`${BASE_URL}/api/vacancy/${id}`, { headers: ah }), {
    'SOFT DELETE — 404': (r) => r.status === 404,
  });

  // 404 NOT EXISTENT
  check(http.del(`${BASE_URL}/api/vacancy/999999`, null, { headers: ah }), {
    'DELETE non-existent — 404': (r) => r.status === 404,
  });

  console.log('\n✅ Vacancy CRUD completed');
}
