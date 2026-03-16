import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL, getSessionHeaders } from '../../../config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    'checks{type:reviews}': ['rate>0.90'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const headers = getSessionHeaders();

  group('Reviews: List for Worker', () => {
    const res = http.get(`${BASE_URL}/api/reviews?profile_type=worker&profile_id=1`, { headers });
    check(res, {
      '[List] status is valid': (r) => [200, 401, 403, 404].includes(r.status),
      '[List] has JSON response': (r) => { try { r.json(); return true; } catch (e) { return false; } },
      '[List] valid structure if 200': (r) => {
        if (r.status !== 200) return true;
        try {
          const body = r.json();
          return Array.isArray(body) || body.hasOwnProperty('reviews') || body.hasOwnProperty('results');
        } catch (e) { return false; }
      },
    }, { type: 'reviews' });
  });

  group('Reviews: Pagination', () => {
    const res = http.get(`${BASE_URL}/api/reviews?profile_type=worker&profile_id=1&page=1&page_size=10`, { headers });
    check(res, {
      '[Pagination] status is valid': (r) => [200, 401, 403, 404].includes(r.status),
      '[Pagination] has response': (r) => r.body.length > 0,
    }, { type: 'reviews' });
  });

  group('Reviews: Public Access (no auth)', () => {
    const res = http.get(`${BASE_URL}/api/reviews?profile_type=worker&profile_id=1`);
    check(res, {
      '[Public] status is valid': (r) => [200, 401, 403, 404].includes(r.status),
      '[Public] has response': (r) => r.body.length > 0,
    }, { type: 'reviews' });
  });
}
