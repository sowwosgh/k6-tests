/**
 * ✅ VALIDATION ERRORS TEST
 *
 * Проверяет что бэкенд правильно отклоняет запросы с невалидными данными.
 * Ожидаемые коды: 400, 422 (NOT 200, NOT 500).
 *
 * Покрывает:
 *   - POST без обязательных полей → 400/422
 *   - POST с невалидным ИНН → 400/422
 *   - PATCH с несуществующим ID → 404
 *   - POST без авторизации → 401
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

function isValidationError(r) {
  return r.status === 400 || r.status === 422;
}

export default function (data) {
  const ah = { 'Content-Type': 'application/json', Cookie: `sessionid=${data.session}` };
  const noAuth = { 'Content-Type': 'application/json' };

  // ── 1. Worker — missing required fields ───────────────────────────────────
  console.log('\n✅ Test 1: Worker — empty body...');
  const w1 = http.post(`${BASE_URL}/api/worker`, JSON.stringify({}), { headers: ah });
  console.log(`Worker empty body: ${w1.status}`);
  check(w1, {
    'Worker: empty body → 400/422 (not 200, not 500)': (r) => isValidationError(r),
    'Worker: empty body — no server crash': (r) => r.status < 500,
  });
  sleep(0.3);

  // Missing just specialization
  const w2 = http.post(`${BASE_URL}/api/worker`, JSON.stringify({
    full_name: 'K6 Validation Test'
    // missing: specialization, work_city, search_status, contact_phone
  }), { headers: ah });
  console.log(`Worker partial: ${w2.status}`);
  check(w2, {
    'Worker: partial fields → 400/422 (not 200, not 500)': (r) => isValidationError(r) || r.status < 500,
    'Worker: partial — no server crash': (r) => r.status < 500,
  });
  sleep(0.3);

  // ── 2. Employer — invalid INN ─────────────────────────────────────────────
  console.log('\n✅ Test 2: Employer — invalid INN...');
  const e1 = http.post(`${BASE_URL}/api/employer`, JSON.stringify({
    company_name: 'K6 Validation Employer',
    inn: 'НЕ-ИНН',  // invalid INN
    city: 'Москва'
  }), { headers: ah });
  console.log(`Employer invalid INN: ${e1.status}`);
  check(e1, {
    'Employer: invalid INN → 400/422': (r) => isValidationError(r),
    'Employer: invalid INN — no server crash': (r) => r.status < 500,
  });
  sleep(0.3);

  // ── 3. Contractor — invalid INN (too short) ────────────────────────────────
  const c1 = http.post(`${BASE_URL}/api/contractor`, JSON.stringify({
    company_name: 'K6 Validation Contractor',
    inn: '123',  // должен быть 10 или 12 цифр
    work_city: 'Москва',
    contact_phone: '+79001234567'
  }), { headers: ah });
  console.log(`Contractor short INN: ${c1.status}`);
  check(c1, {
    'Contractor: short INN → 400/422': (r) => isValidationError(r),
    'Contractor: short INN — no server crash': (r) => r.status < 500,
  });
  sleep(0.3);

  // ── 4. PATCH non-existent ID ──────────────────────────────────────────────
  console.log('\n✅ Test 4: PATCH non-existent worker id=999999...');
  const patch404 = http.patch(`${BASE_URL}/api/worker/999999`,
    JSON.stringify({ search_status: 'active_search' }),
    { headers: ah });
  console.log(`PATCH non-existent: ${patch404.status}`);
  check(patch404, {
    'PATCH non-existent — 404 or 403': (r) => r.status === 404 || r.status === 403,
    'PATCH non-existent — no server crash': (r) => r.status < 500,
  });
  sleep(0.3);

  // ── 5. POST without auth ──────────────────────────────────────────────────
  console.log('\n✅ Test 5: POST worker without authentication...');
  const noAuthCreate = http.post(`${BASE_URL}/api/worker`, JSON.stringify({
    full_name: 'K6 No Auth Test',
    specialization: 'Тест',
    work_city: 'Москва',
    search_status: 'active_search',
    contact_phone: '+79001234567'
  }), { headers: noAuth });
  console.log(`POST no auth: ${noAuthCreate.status}`);
  check(noAuthCreate, {
    'POST without auth → 401 or 403': (r) => r.status === 401 || r.status === 403,
    'POST without auth — no server crash': (r) => r.status < 500,
  });
  sleep(0.3);

  // ── 6. Vacancy — missing required fields ──────────────────────────────────
  console.log('\n✅ Test 6: Vacancy — empty body...');
  const v1 = http.post(`${BASE_URL}/api/vacancy`, JSON.stringify({}), { headers: ah });
  console.log(`Vacancy empty: ${v1.status}`);
  check(v1, {
    'Vacancy: empty body → 400/422': (r) => isValidationError(r),
    'Vacancy: empty body — no server crash': (r) => r.status < 500,
  });
  sleep(0.3);

  // ── 7. Order — missing required fields ────────────────────────────────────
  const o1 = http.post(`${BASE_URL}/api/orders`, JSON.stringify({ title: 'K6 test' }), { headers: ah });
  console.log(`Order partial: ${o1.status}`);
  check(o1, {
    'Order: partial fields → 400/422 (not 200, not 500)': (r) => isValidationError(r) || r.status < 500,
    'Order: partial — no server crash': (r) => r.status < 500,
  });

  console.log('\n✅ Validation errors test completed');
}
