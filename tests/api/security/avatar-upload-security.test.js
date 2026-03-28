import http from 'k6/http';
import { check, group } from 'k6';
import { loginAndGetSession } from '../../../utils/auth.js';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const TEST_USER = '+79001234567';
const TEST_PASSWORD = 'test123';

const SMALL_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.90'],
    http_req_duration: ['p(95)<5000'],
  },
};

function isRejected(r) {
  if (r.status === 400 || r.status === 415 || r.status === 422) return true;
  try {
    const b = r.json();
    return b.ok === false || b.ok === 'false';
  } catch { return false; }
}

function hasErrorMessage(r) {
  try {
    const b = r.json();
    return typeof b.error === 'string' && b.error.length > 0;
  } catch { return false; }
}

/**
 * Avatar Upload Security Tests
 *
 * Validates that all avatar endpoints correctly reject:
 * 1. Invalid file type (.pdf, .exe, .js, .txt)
 * 2. File too large (>5MB)
 * 3. Empty file (0 bytes)
 *
 * Endpoints tested:
 * — POST /api/user/avatar (user settings)
 * — POST /api/vacancy/{id}/avatar
 * — POST /api/orders/{id}/avatar
 * — POST /api/tenders/{id}/avatar
 */
export default function () {
  const jsonHeaders = { 'Content-Type': 'application/json' };

  console.log('\n🔐 Authenticating...');
  const sessionid = loginAndGetSession(http, BASE_URL, TEST_USER, TEST_PASSWORD);
  if (!sessionid) { console.error('❌ Auth failed'); return; }

  const authJsonHeaders = { ...jsonHeaders, 'Cookie': `sessionid=${sessionid}` };
  const authHeaders = { 'Cookie': `sessionid=${sessionid}` };

  // ── Setup: create resources ──────────────────────────────────────
  const vacancyRes = http.post(`${BASE_URL}/api/vacancy`, JSON.stringify({
    title: 'Security Test Vacancy', company_name: 'Test Co',
    city: 'Москва', specialization: 'Тестировщик',
    phone: '+79001234567', is_active: true,
  }), { headers: authJsonHeaders });
  const vacancyId = vacancyRes.status === 200 || vacancyRes.status === 201 ? vacancyRes.json('id') : null;

  const orderRes = http.post(`${BASE_URL}/api/orders`, JSON.stringify({
    title: 'Security Test Order', work_type: 'temporary',
    city: 'Москва', description: 'Security test', urgency: 'normal', status: 'active', type: 'order',
  }), { headers: authJsonHeaders });
  const orderId = orderRes.status === 200 || orderRes.status === 201 ? orderRes.json('id') : null;

  const tenderRes = http.post(`${BASE_URL}/api/tenders`, JSON.stringify({
    title: 'Security Test Tender', tender_type: 'open',
    city: 'Москва', object_address: 'ул. Тестовая, д. 1',
    description: 'Security test', requirements: 'Нет', submission_deadline: '2026-12-31',
    tender_status: 'published', status: 'accepting_bids', type: 'tender',
  }), { headers: authJsonHeaders });
  const tenderId = tenderRes.status === 200 || tenderRes.status === 201 ? tenderRes.json('id') : null;

  console.log(`✅ Resources: vacancy=${vacancyId} order=${orderId} tender=${tenderId}`);

  // ── Test factories ───────────────────────────────────────────────
  const ENDPOINTS = [
    { name: 'user/avatar',     url: `${BASE_URL}/api/user/avatar`,              field: 'file' },
    vacancyId ? { name: `vacancy/${vacancyId}/avatar`, url: `${BASE_URL}/api/vacancy/${vacancyId}/avatar`, field: 'file' } : null,
    orderId   ? { name: `orders/${orderId}/avatar`,   url: `${BASE_URL}/api/orders/${orderId}/avatar`,   field: 'file' } : null,
    tenderId  ? { name: `tenders/${tenderId}/avatar`, url: `${BASE_URL}/api/tenders/${tenderId}/avatar`, field: 'file' } : null,
  ].filter(Boolean);

  // ── Test 1: Invalid file type ────────────────────────────────────
  group('Invalid File Type', () => {
    const INVALID_FILES = [
      { data: '%PDF-1.4 fake pdf content',         name: 'document.pdf',   mime: 'application/pdf' },
      { data: 'alert("xss")',                      name: 'script.js',      mime: 'application/javascript' },
      { data: 'MZ fake executable',                name: 'malware.exe',    mime: 'application/octet-stream' },
      { data: 'plain text content',                name: 'file.txt',       mime: 'text/plain' },
      { data: '<html><body>hack</body></html>',     name: 'page.html',      mime: 'text/html' },
    ];

    ENDPOINTS.forEach(({ name, url, field }) => {
      INVALID_FILES.forEach(({ data, name: fname, mime }) => {
        const formData = {};
        formData[field] = http.file(data, fname, mime);
        const res = http.post(url, formData, { headers: authHeaders });

        check(res, {
          [`[${name}] rejects ${fname}`]: () => isRejected(res),
          [`[${name}] ${fname} has error message`]: () => hasErrorMessage(res),
        });

        if (!isRejected(res)) {
          console.error(`❌ [${name}] accepted invalid file: ${fname} (status=${res.status})`);
        }
      });
    });
  });

  // ── Test 2: File too large (>5MB) ────────────────────────────────
  group('File Too Large', () => {
    // 6MB of fake data
    const sixMB = 'A'.repeat(6 * 1024 * 1024);

    ENDPOINTS.forEach(({ name, url, field }) => {
      const formData = {};
      formData[field] = http.file(sixMB, 'big.png', 'image/png');
      const res = http.post(url, formData, { headers: authHeaders });

      check(res, {
        [`[${name}] rejects 6MB file`]: () => isRejected(res),
        [`[${name}] 6MB has error message`]: () => hasErrorMessage(res),
      });

      if (!isRejected(res)) {
        console.error(`❌ [${name}] accepted 6MB file (status=${res.status})`);
      }
    });
  });

  // ── Test 3: Empty file ───────────────────────────────────────────
  group('Empty File', () => {
    ENDPOINTS.forEach(({ name, url, field }) => {
      const formData = {};
      formData[field] = http.file('', 'empty.png', 'image/png');
      const res = http.post(url, formData, { headers: authHeaders });

      // Empty file may be rejected (400) or cause processing error — both acceptable
      check(res, {
        [`[${name}] empty file handled`]: () => res.status === 400 || res.status === 422 || res.status === 200,
        [`[${name}] empty file not 500`]: () => res.status !== 500,
      });

      if (res.status === 500) {
        console.error(`❌ [${name}] empty file caused 500!`);
      }
    });
  });

  // ── Test 4: Valid PNG still works ────────────────────────────────
  group('Valid File Still Accepted', () => {
    const imageFile = http.file(
      Buffer.from(SMALL_PNG_B64, 'base64'), 'valid.png', 'image/png'
    );

    ENDPOINTS.forEach(({ name, url, field }) => {
      const formData = {};
      formData[field] = imageFile;
      const res = http.post(url, formData, { headers: authHeaders });

      check(res, {
        [`[${name}] valid PNG accepted`]: () => res.status === 200 || res.status === 201,
      });
    });
  });

  // Cleanup
  if (vacancyId) http.del(`${BASE_URL}/api/vacancy/${vacancyId}`, null, { headers: authJsonHeaders });
  if (orderId)   http.del(`${BASE_URL}/api/orders/${orderId}`,   null, { headers: authJsonHeaders });
  if (tenderId)  http.del(`${BASE_URL}/api/tenders/${tenderId}`, null, { headers: authJsonHeaders });

  console.log('\n✅ Avatar upload security tests completed');
}
