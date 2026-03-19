/**
 * Missing fields in read response — regression test
 * Verifies that fields accepted on UPDATE are returned by READ:
 *   - Worker: date_of_birth
 *   - Contractor: about (alias for description)
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { getSession } from '../../../utils/session.js';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';

export function setup() { return getSession(); }

export const options = {
  vus: 1, iterations: 1,
  thresholds: { checks: ['rate>0.85'] },
};

export default function (data) {
  const ah = { 'Content-Type': 'application/json', Cookie: `sessionid=${data.session}` };

  // =============================================
  // WORKER: date_of_birth round-trip
  // =============================================
  let workerId = null;

  group('Worker — create', () => {
    const res = http.post(`${BASE_URL}/api/worker`, JSON.stringify({
      full_name: 'K6 DOB Test',
      specialization: 'Тест',
      work_city: 'Москва',
      search_status: 'active_search',
      contact_phone: '+79001230001',
    }), { headers: ah });
    check(res, {
      'worker create 200': (r) => r.status === 200,
      'worker create no 500': (r) => r.status < 500,
    });
    if (res.status === 200) {
      try { workerId = res.json().id; } catch (_) {}
    }
  });
  sleep(0.3);

  if (workerId) {
    group('Worker — PATCH date_of_birth', () => {
      const res = http.patch(`${BASE_URL}/api/worker/${workerId}`,
        JSON.stringify({ date_of_birth: '1985-11-20' }),
        { headers: ah });
      check(res, { 'worker patch 200': (r) => r.status === 200 });
    });
    sleep(0.3);

    group('Worker — READ returns date_of_birth', () => {
      const res = http.get(`${BASE_URL}/api/worker/${workerId}`, { headers: ah });
      check(res, {
        'worker read 200': (r) => r.status === 200,
        'worker read has date_of_birth': (r) => {
          try { return r.json().date_of_birth === '1985-11-20'; } catch (_) { return false; }
        },
      });
    });
    sleep(0.3);

    // cleanup
    http.del(`${BASE_URL}/api/worker/${workerId}`, null, { headers: ah });
    sleep(0.3);
  }

  // =============================================
  // CONTRACTOR: about round-trip
  // =============================================
  let contractorId = null;

  group('Contractor — create with about', () => {
    const res = http.post(`${BASE_URL}/api/contractor`, JSON.stringify({
      company_name: 'K6 About Test LLC',
      inn: '7700000' + String(Date.now()).slice(-5),
      city: 'Москва',
      about: 'Тестовое описание компании',
      contact_phone: '+79001230002',
    }), { headers: ah });
    check(res, {
      'contractor create 200': (r) => r.status === 200,
      'contractor create no 500': (r) => r.status < 500,
    });
    if (res.status === 200) {
      try { contractorId = res.json().id; } catch (_) {}
    }
  });
  sleep(0.3);

  if (contractorId) {
    group('Contractor — READ returns about', () => {
      const res = http.get(`${BASE_URL}/api/contractor/${contractorId}`, { headers: ah });
      check(res, {
        'contractor read 200': (r) => r.status === 200,
        'contractor read has about': (r) => {
          try { return typeof r.json().about === 'string' && r.json().about.length > 0; } catch (_) { return false; }
        },
      });
    });
    sleep(0.3);

    group('Contractor — UPDATE about', () => {
      const res = http.patch(`${BASE_URL}/api/contractor/${contractorId}`,
        JSON.stringify({ about: 'Обновлённое описание' }),
        { headers: ah });
      check(res, { 'contractor patch 200': (r) => r.status === 200 });
    });
    sleep(0.3);

    group('Contractor — READ after UPDATE reflects new about', () => {
      const res = http.get(`${BASE_URL}/api/contractor/${contractorId}`, { headers: ah });
      check(res, {
        'contractor read updated about': (r) => {
          try { return r.json().about === 'Обновлённое описание'; } catch (_) { return false; }
        },
      });
    });
    sleep(0.3);

    // cleanup
    http.del(`${BASE_URL}/api/contractor/${contractorId}`, null, { headers: ah });
    sleep(0.3);
  }

  console.log('\n✅ Missing fields read-response test completed');
}
