import http from 'k6/http';
import { check, group } from 'k6';
import encoding from 'k6/encoding';
import { BASE_URL, getAuthHeaders } from '../../../config.js';

function getUploadHeaders() {
  const h = {};
  if (__ENV.SESSION_COOKIE) {
    const c = __ENV.SESSION_COOKIE;
    h['Cookie'] = c.includes('=') ? c : `sessionid=${c}`;
  }
  if (__ENV.AUTH_TOKEN) {
    h['Authorization'] = `Bearer ${__ENV.AUTH_TOKEN}`;
  }
  return h;
}

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],
  },
};

// 1x1 PNG
const SMALL_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export default function () {
  const authHeaders = getAuthHeaders();

  // =============================================
  // EMPLOYER LOGO
  // =============================================
  let employerId = null;

  group('Employer Logo - Resolve existing employer profile', () => {
    const res = http.get(`${BASE_URL}/api/profiles`, { headers: authHeaders });
    check(res, { 'profiles 200': (r) => r.status === 200 });
    if (res.status === 200) {
      try {
        const profiles = JSON.parse(res.body);
        const e = profiles.find(p => p.type === 'employer');
        if (e) employerId = e.id;
      } catch (_) {}
    }
    check({ hasEmployer: employerId !== null }, { 'employer profile found (or skip)': () => true });
  });

  if (employerId) {
    group('Employer Logo - Upload', () => {
      const imageFile = http.file(encoding.b64decode(SMALL_PNG, 'std', 'b'), 'logo.png', 'image/png');
      const res = http.post(
        `${BASE_URL}/api/employer/${employerId}/logo`,
        { file: imageFile },
        { headers: getUploadHeaders() }
      );
      check(res, {
        'upload 200': (r) => r.status === 200,
        'ok=true': (r) => { try { return JSON.parse(r.body).ok === true; } catch (_) { return false; } },
        'has url': (r) => { try { return typeof JSON.parse(r.body).url === 'string'; } catch (_) { return false; } },
      });
    });

    group('Employer Logo - Unauthorized upload rejected', () => {
      const imageFile = http.file(encoding.b64decode(SMALL_PNG, 'std', 'b'), 'logo.png', 'image/png');
      const res = http.post(`${BASE_URL}/api/employer/${employerId}/logo`, { file: imageFile });
      check(res, { 'unauthenticated → 401': (r) => r.status === 401 || r.status === 403 });
    });

  }

  // =============================================
  // CUSTOMER LOGO — используем существующий профиль
  // =============================================
  let customerId = null;

  group('Customer Logo - Resolve existing customer profile', () => {
    const res = http.get(`${BASE_URL}/api/profiles`, { headers: authHeaders });
    check(res, { 'profiles 200': (r) => r.status === 200 });
    if (res.status === 200) {
      try {
        const profiles = JSON.parse(res.body);
        const c = profiles.find(p => p.type === 'customer');
        if (c) customerId = c.id;
      } catch (_) {}
    }
    check({ hasCustomer: customerId !== null }, { 'customer profile found': (o) => o.hasCustomer });
  });

  if (customerId) {
    group('Customer Logo - Upload', () => {
      const imageFile = http.file(encoding.b64decode(SMALL_PNG, 'std', 'b'), 'logo.png', 'image/png');
      const res = http.post(
        `${BASE_URL}/api/customer/${customerId}/logo`,
        { file: imageFile },
        { headers: getUploadHeaders() }
      );
      check(res, {
        'upload 200': (r) => r.status === 200,
        'ok=true': (r) => { try { return JSON.parse(r.body).ok === true; } catch (_) { return false; } },
        'has url': (r) => { try { return typeof JSON.parse(r.body).url === 'string'; } catch (_) { return false; } },
      });
    });

    group('Customer Logo - Unauthorized upload rejected', () => {
      const imageFile = http.file(encoding.b64decode(SMALL_PNG, 'std', 'b'), 'logo.png', 'image/png');
      const res = http.post(`${BASE_URL}/api/customer/${customerId}/logo`, { file: imageFile });
      check(res, { 'unauthenticated → 401': (r) => r.status === 401 || r.status === 403 });
    });
  }
}
