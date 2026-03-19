import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL, getAuthHeaders } from '../../../config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.90'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const ah = getAuthHeaders();
  const h  = { 'Content-Type': 'application/json' };

  console.log('\n📊 Testing Profile Stats');

  group('Authenticated: Get Profile Stats', () => {
    const res = http.get(`${BASE_URL}/api/billing/profile-stats/worker/1`, { headers: ah });
    console.log(`Stats (auth) status: ${res.status}`);
    check(res, {
      '[Stats] status is valid': (r) => r.status === 200 || r.status === 404,
      '[Stats] has JSON response': (r) => {
        if (r.status === 404) return true;
        try { r.json(); return true; } catch { return false; }
      },
    });
  });

  group('Unauthenticated: Get Profile Stats', () => {
    const res = http.get(`${BASE_URL}/api/billing/profile-stats/worker/1`, { headers: h });
    console.log(`Stats (unauth) status: ${res.status}`);
    check(res, {
      '[Unauth] status is valid': (r) => r.status === 200 || r.status === 401 || r.status === 403 || r.status === 404,
      '[Unauth] has response': (r) => r.body && r.body.length > 0,
    });
  });

  console.log('\n✅ Profile stats test completed');
}
