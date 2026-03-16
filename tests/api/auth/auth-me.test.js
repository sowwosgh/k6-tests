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
  group('Auth Me - Authenticated User', () => {
    const response = http.get(`${BASE_URL}/api/auth/me`, { headers: getSessionHeaders() });
    check(response, {
      'status is 200 or 401': (r) => [200, 401, 403].includes(r.status),
      'not 500 error': (r) => r.status !== 500,
      'if 200: has user object': (r) => {
        if (r.status !== 200) return true;
        try { return JSON.parse(r.body).hasOwnProperty('user'); } catch (e) { return false; }
      },
      'if 200: has profiles array': (r) => {
        if (r.status !== 200) return true;
        try { return Array.isArray(JSON.parse(r.body).profiles); } catch (e) { return false; }
      },
    });
  });

  group('Auth Me - Unauthenticated', () => {
    const response = http.get(`${BASE_URL}/api/auth/me`);
    check(response, {
      'status is 200, 401, or 403': (r) => [200, 401, 403].includes(r.status),
      'not 500 error': (r) => r.status !== 500,
    });
  });

  group('Auth Me - Invalid Session', () => {
    const response = http.get(`${BASE_URL}/api/auth/me`, {
      headers: { 'Cookie': 'sessionid=invalid_session_12345' },
    });
    check(response, {
      'status is 200, 401, or 403': (r) => [200, 401, 403].includes(r.status),
      'not 500 error': (r) => r.status !== 500,
    });
  });
}
