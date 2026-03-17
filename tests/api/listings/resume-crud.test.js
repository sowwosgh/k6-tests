/**
 * Resume — Full CRUD Integration Test
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
  console.log('\n📝 CREATE resume...');
  const createRes = http.post(`${BASE_URL}/api/resume`, JSON.stringify({
    full_name: 'K6 Тест Кандидат',
    age: 30,
    desired_position: 'Инженер-строитель',
    salary: 100000,
    salary_negotiable: true,
    employment_type: 'full',
    city: 'Москва',
    education_level: 'Высшее',
    experience_years: 5,
    phone: '+79001234567',
    email: 'k6resume@test.com'
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
  const readRes = http.get(`${BASE_URL}/api/resume/${id}`, { headers: ah });
  check(readRes, {
    'READ — 200': (r) => r.status === 200,
    'READ — desired_position matches': (r) => { try { return r.json().desired_position === 'Инженер-строитель'; } catch { return false; } },
  });
  sleep(0.3);

  // UPDATE
  const patchRes = http.patch(`${BASE_URL}/api/resume/${id}`,
    JSON.stringify({ salary: 120000, experience_years: 6, employment_type: 'remote' }),
    { headers: ah });
  console.log(`PATCH: ${patchRes.status}`);
  check(patchRes, {
    'UPDATE — 200': (r) => r.status === 200,
    'UPDATE — no 500': (r) => r.status < 500,
  });
  sleep(0.3);

  // DELETE
  const delRes = http.del(`${BASE_URL}/api/resume/${id}`, null, { headers: ah });
  check(delRes, { 'DELETE — 200 or 204': (r) => r.status === 200 || r.status === 204 });
  sleep(0.5);

  // 404 AFTER DELETE
  check(http.get(`${BASE_URL}/api/resume/${id}`, { headers: ah }), {
    'SOFT DELETE — 404': (r) => r.status === 404,
  });

  console.log('\n✅ Resume CRUD completed');
}
