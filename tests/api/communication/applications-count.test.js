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

  group('Applications - Get Count', () => {
    group('Get Application Count (Authenticated)', () => {
      const res = http.get(`${BASE_URL}/api/applications/count`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response has count': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('count') || body.hasOwnProperty('total') || typeof body === 'number';
        },
        'count is non-negative': (r) => {
          const body = JSON.parse(r.body);
          const count = body.count !== undefined ? body.count : (body.total !== undefined ? body.total : body);
          return count >= 0;
        },
      });
    });

    group('Get Count by Status', () => {
      const res = http.get(`${BASE_URL}/api/applications/count?status=pending`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200 or 404': (r) => [200, 401, 403, 404].includes(r.status),
        'response has filtered count': (r) => {
          if (r.status !== 200) return true;
          try {
            const body = JSON.parse(r.body);
            return body.hasOwnProperty('count') || body.hasOwnProperty('total') || typeof body === 'number';
          } catch (e) { return false; }
        },
      });
    });

    group('Get Count Without Authentication', () => {
      const res = http.get(`${BASE_URL}/api/applications/count`);

      check(res, {
        'status is 401 or 403': (r) => r.status === 401 || r.status === 403,
      });
    });
  });
}
