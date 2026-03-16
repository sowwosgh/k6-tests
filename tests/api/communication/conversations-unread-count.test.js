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

  group('Conversations - Unread Count', () => {
    group('Get Unread Message Count (Authenticated)', () => {
      const res = http.get(`${BASE_URL}/api/conversations/unread-count`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response has count field': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('count') || body.hasOwnProperty('unread_count') || typeof body === 'number';
        },
        'count is non-negative': (r) => {
          const body = JSON.parse(r.body);
          const count = body.count !== undefined ? body.count : (body.unread_count !== undefined ? body.unread_count : body);
          return count >= 0;
        },
      });
    });

    group('Get Unread Count Alternative Endpoint', () => {
      const res = http.get(`${BASE_URL}/api/messages/unread`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
        'valid response if supported': (r) => {
          if (r.status === 404) return true;
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('count') || body.hasOwnProperty('unread') || typeof body === 'number';
        },
      });
    });

    group('Get Unread Count Without Authentication', () => {
      const res = http.get(`${BASE_URL}/api/conversations/unread-count`);

      check(res, {
        'status is 401 or 403': (r) => r.status === 401 || r.status === 403,
      });
    });
  });
}
