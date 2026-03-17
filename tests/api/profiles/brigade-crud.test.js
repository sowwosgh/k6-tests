/**
 * Brigade Profile — Full CRUD Integration Test
 * CREATE → READ → UPDATE → list in /api/profiles → DELETE (soft) → 404
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { getSession } from '../../../utils/session.js';

const BASE_URL      = __ENV.BASE_URL      || 'https://sowwos.ru';

export function setup() { return getSession(); }

export const options = {
  vus: 1, iterations: 1,
  thresholds: { checks: ['rate>0.85'], http_req_duration: ['p(95)<3000'] },
};

export default function (data) {

  const ah = { 'Content-Type': 'application/json', Cookie: `sessionid=${data.session}` };

  // CREATE
  console.log('\n📝 CREATE brigade...');
  const createRes = http.post(`${BASE_URL}/api/brigade`, JSON.stringify({
    name: 'K6 Test Brigade',
    leader_name: 'K6 Бригадир',
    team_size: 5,
    specs: 'Кирпичная кладка, Бетонные работы',
    work_city: 'Москва',
    work_region: 'Московская область',
    status: 'available',
    contact_person: 'K6 Бригадир',
    contact_phone: '+79001234567'
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
  const readRes = http.get(`${BASE_URL}/api/brigade/${id}`, { headers: ah });
  check(readRes, {
    'READ — 200': (r) => r.status === 200,
    'READ — name matches': (r) => { try { return r.json().name === 'K6 Test Brigade'; } catch { return false; } },
  });
  sleep(0.3);

  // UPDATE
  const patchRes = http.patch(`${BASE_URL}/api/brigade/${id}`,
    JSON.stringify({ status: 'on_site', team_size: 7, transport: 'Газель' }),
    { headers: ah });
  console.log(`PATCH: ${patchRes.status}`);
  check(patchRes, {
    'UPDATE — 200': (r) => r.status === 200,
    'UPDATE — no 500': (r) => r.status < 500,
  });
  sleep(0.3);

  // IN PROFILES LIST
  const listRes = http.get(`${BASE_URL}/api/profiles`, { headers: ah });
  check(listRes, {
    'LIST — 200': (r) => r.status === 200,
    'LIST — brigade present': (r) => {
      try {
        const items = r.json(); const list = Array.isArray(items) ? items : (items.results || items.profiles || []);
        return list.some(p => p.id === id);
      } catch { return false; }
    },
  });
  sleep(0.3);

  // DELETE
  const delRes = http.del(`${BASE_URL}/api/brigade/${id}`, null, { headers: ah });
  check(delRes, { 'DELETE — 200 or 204': (r) => r.status === 200 || r.status === 204 });
  sleep(0.5);

  // 404 AFTER DELETE
  check(http.get(`${BASE_URL}/api/brigade/${id}`, { headers: ah }), {
    'SOFT DELETE — 404': (r) => r.status === 404,
  });

  console.log('\n✅ Brigade CRUD completed');
}
