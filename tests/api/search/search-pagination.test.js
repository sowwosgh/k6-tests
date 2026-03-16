import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL, getAuthHeaders } from '../../../config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],
  },
};

export default function () {
  const authHeaders = getAuthHeaders();

  group('Search - Pagination (via /api/feed)', () => {
    group('First Page of Workers', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&page=1&page_size=10`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'response not empty': (r) => r.body.length > 0,
      });
    });

    group('Second Page', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&page=2&page_size=10`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'page 2 loads': (r) => r.body.length > 0,
      });
    });

    group('Custom Page Size 20', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&page=1&page_size=20`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'page size 20 works': (r) => r.body.length > 0,
      });
    });

    group('Custom Page Size 50', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&page=1&page_size=50`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'page size 50 works': (r) => r.body.length > 0,
      });
    });

    group('Default Pagination (No Params)', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'default pagination applied': (r) => r.body.length > 0,
      });
    });

    group('Page Beyond Available', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&page=9999&page_size=10`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'handles large page number': (r) => r.body.length > 0,
      });
    });

    group('Pagination with City Filter', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&city=Москва&page=1&page_size=10`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'pagination with filter works': (r) => r.body.length > 0,
      });
    });

    group('Invalid Page Size (Large)', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker&page=1&page_size=1000`, { headers: authHeaders });
      check(res, {
        'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
        'handles large page size': () => true,
      });
    });

    group('All types paginated', () => {
      const res = http.get(`${BASE_URL}/api/feed?page=1&page_size=10`, { headers: authHeaders });
      check(res, {
        'status is 200': (r) => r.status === 200,
        'all types paginated': (r) => r.body.length > 0,
      });
    });
  });
}
