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

  console.log('\n✨ Testing Profile Active Promotions');

  group('Authenticated: Get Profile Promotions', () => {
    const res = http.get(`${BASE_URL}/api/promotions/active/worker/1`, { headers: ah });
    console.log(`Active (auth) status: ${res.status}`);
    check(res, {
      '[Active] status is valid': (r) => r.status === 200 || r.status === 404,
      '[Active] has response': (r) => r.body && r.body.length > 0,
      '[Active] has promotions data': (r) => {
        if (r.status === 404) return true;
        try {
          const b = r.json();
          return b.hasOwnProperty('boost') || b.hasOwnProperty('urgent') ||
                 b.hasOwnProperty('promotions') || Array.isArray(b);
        } catch { return r.body && r.body.length > 0; }
      },
    });
  });

  group('Public: Get Profile Promotions', () => {
    const res = http.get(`${BASE_URL}/api/promotions/active/worker/1`, { headers: h });
    console.log(`Active (public) status: ${res.status}`);
    check(res, {
      '[Public] status is valid': (r) => r.status === 200 || r.status === 401 || r.status === 404,
      '[Public] has response': (r) => r.body && r.body.length > 0,
    });
  });

  console.log('\n✅ Profile promotions test completed');
}
