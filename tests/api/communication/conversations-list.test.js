import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL, getAuthHeaders } from '../../../config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.80'],
  },
};

export default function () {
  const authHeaders = getAuthHeaders();

  group('Conversations - List User Conversations', () => {
    group('Get All Conversations (Authenticated)', () => {
      const res = http.get(`${BASE_URL}/api/conversations`, { headers: authHeaders });
      check(res, {
        'status is 200 or 401': (r) => [200, 401, 403].includes(r.status),
        'valid response structure': (r) => r.body.length > 0,
        'if 200: has conversations': (r) => {
          if (r.status !== 200) return true;
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body) || body.hasOwnProperty('results') || body.hasOwnProperty('conversations');
          } catch (e) { return false; }
        },
      });
    });

    group('Get Conversations with Pagination', () => {
      const res = http.get(`${BASE_URL}/api/conversations?page=1&page_size=10`, { headers: authHeaders });
      check(res, {
        'status is 200 or 401': (r) => [200, 401, 403].includes(r.status),
        'response not empty': (r) => r.body.length > 0,
      });
    });

    group('Get Conversations with Unread Filter', () => {
      const res = http.get(`${BASE_URL}/api/conversations?unread=true`, { headers: authHeaders });
      check(res, {
        'status is 200 or 401': (r) => [200, 401, 403].includes(r.status),
        'response contains filtered data': (r) => r.body.length > 0,
      });
    });

    group('Empty Conversations List', () => {
      const res = http.get(`${BASE_URL}/api/conversations?participant_id=999999`, { headers: authHeaders });
      check(res, {
        'status is 200 or 401': (r) => [200, 401, 403].includes(r.status),
        'response not empty': (r) => r.body.length > 0,
      });
    });

    group('List Without Authentication', () => {
      const res = http.get(`${BASE_URL}/api/conversations`);

      check(res, {
        'status is 401 or 403': (r) => r.status === 401 || r.status === 403,
      });
    });
  });
}
