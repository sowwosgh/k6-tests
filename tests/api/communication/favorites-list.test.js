import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL, getSessionHeaders } from '../../../config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    'checks{type:favorites}': ['rate>0.90'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const headers = getSessionHeaders();

  group('Favorites: Get List', () => {
    const res = http.get(`${BASE_URL}/api/favorites`, { headers });
    check(res, {
      '[List] status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      '[List] has JSON response': (r) => { try { r.json(); return true; } catch (e) { return false; } },
      '[List] valid structure if 200': (r) => {
        if (r.status !== 200) return true;
        try {
          const body = r.json();
          return Array.isArray(body) || body.hasOwnProperty('favorites') || body.hasOwnProperty('results');
        } catch (e) { return false; }
      },
    }, { type: 'favorites' });
  });

  group('Favorites: Pagination', () => {
    const res = http.get(`${BASE_URL}/api/favorites?page=1&page_size=10`, { headers });
    check(res, {
      '[Pagination] status is valid': (r) => [200, 401, 403].includes(r.status),
      '[Pagination] has response': (r) => r.body.length > 0,
    }, { type: 'favorites' });
  });

  group('Favorites: Unauthenticated List', () => {
    const res = http.get(`${BASE_URL}/api/favorites`, { headers: { 'Content-Type': 'application/json' } });
    check(res, {
      '[UnauthList] access denied': (r) => r.status === 401 || r.status === 403,
      '[UnauthList] has error': (r) => r.body.length > 0,
    }, { type: 'favorites' });
  });
}
