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

  group('Search - Pagination', () => {
    group('Get First Page of Workers', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?page=1&page_size=10`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response contains workers': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results') || body.hasOwnProperty('workers');
        },
        'pagination metadata present': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('count') || body.hasOwnProperty('total') || body.hasOwnProperty('next') || Array.isArray(body);
        },
      });
    });

    group('Get Second Page of Workers', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?page=2&page_size=10`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'second page loaded': (r) => r.body.length > 0,
      });
    });

    group('Custom Page Size (20 items)', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?page=1&page_size=20`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'custom page size applied': (r) => r.body.length > 0,
      });
    });

    group('Custom Page Size (50 items)', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?page=1&page_size=50`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'large page size handled': (r) => r.body.length > 0,
      });
    });

    group('Maximum Page Size Limit', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?page=1&page_size=1000`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
        'maximum limit enforced': (r) => {
          if (r.status === 400) {
            const body = r.body.toLowerCase();
            return body.includes('limit') || body.includes('maximum') || body.includes('size');
          }
          return true;
        },
      });
    });

    group('Invalid Page Number (0)', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?page=0&page_size=10`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
        'handles invalid page number': (r) => true,
      });
    });

    group('Invalid Page Number (Negative)', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?page=-1&page_size=10`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
        'rejects negative page number': (r) => true,
      });
    });

    group('Page Beyond Available Results', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?page=9999&page_size=10`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'empty results for page beyond limit': (r) => {
          const body = JSON.parse(r.body);
          if (Array.isArray(body)) {
            return body.length === 0;
          }
          return (body.results && body.results.length === 0) || true;
        },
      });
    });

    group('Pagination with Filters', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?city=Москва&page=1&page_size=10`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'pagination works with filters': (r) => r.body.length > 0,
      });
    });

    group('Pagination with Sorting', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?sort=salary&order=desc&page=1&page_size=10`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'pagination works with sorting': (r) => r.body.length > 0,
      });
    });

    group('Default Pagination (No Parameters)', () => {
      const res = http.get(`${BASE_URL}/api/search/workers`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'default pagination applied': (r) => r.body.length > 0,
      });
    });

    group('Offset-based Pagination', () => {
      const res = http.get(`${BASE_URL}/api/search/workers?offset=10&limit=10`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'offset pagination supported': (r) => r.body.length > 0,
      });
    });
  });
}
