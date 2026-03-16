import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL, getSessionHeaders } from '../../../config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.70'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  group('Auth Logout - With Active Session', () => {
    const response = http.post(`${BASE_URL}/api/auth/logout`, null, { headers: getSessionHeaders() });
    check(response, {
      'status is 200': (r) => r.status === 200,
      'not 500 error': (r) => r.status !== 500,
    });
  });

  group('Auth Logout - Without Session', () => {
    const response = http.post(`${BASE_URL}/api/auth/logout`, null, {
      headers: { 'Content-Type': 'application/json' },
    });
    check(response, {
      'status is 200 (logout always succeeds)': (r) => r.status === 200,
      'not 500 error': (r) => r.status !== 500,
    });
  });
}
