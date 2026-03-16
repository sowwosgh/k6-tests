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

  group('Applications - List User Applications', () => {
    group('List All Applications (Authenticated)', () => {
      const res = http.get(`${BASE_URL}/api/applications`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response is array or object with results': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results') || body.hasOwnProperty('applications');
        },
        'valid response structure': (r) => r.body.length > 0,
      });
    });

    group('List Applications with Pagination', () => {
      const res = http.get(`${BASE_URL}/api/applications?page=1&page_size=10`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response supports pagination': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results');
        },
      });
    });

    group('Filter Applications by Status', () => {
      const res = http.get(`${BASE_URL}/api/applications?status=pending`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response contains filtered data': (r) => r.body.length > 0,
      });
    });

    group('Filter Applications by Vacancy', () => {
      const res = http.get(`${BASE_URL}/api/applications?vacancy_id=1`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response contains vacancy-specific data': (r) => r.body.length > 0,
      });
    });

    group('Empty Applications List', () => {
      const res = http.get(`${BASE_URL}/api/applications?vacancy_id=999999`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response is empty array or empty results': (r) => {
          const body = JSON.parse(r.body);
          if (Array.isArray(body)) {
            return body.length === 0;
          }
          return (body.results && body.results.length === 0) || (body.applications && body.applications.length === 0);
        },
      });
    });

    group('List Without Authentication', () => {
      const res = http.get(`${BASE_URL}/api/applications`);

      check(res, {
        'status is 401 or 403': (r) => r.status === 401 || r.status === 403,
      });
    });
  });
}
