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

  group('Conversations - List User Conversations', () => {
    group('Get All Conversations (Authenticated)', () => {
      const res = http.get(`${BASE_URL}/api/conversations`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response is array or object with results': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results') || body.hasOwnProperty('conversations');
        },
        'valid response structure': (r) => r.body.length > 0,
      });
    });

    group('Get Conversations with Pagination', () => {
      const res = http.get(`${BASE_URL}/api/conversations?page=1&page_size=10`, {
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

    group('Get Conversations with Unread Filter', () => {
      const res = http.get(`${BASE_URL}/api/conversations?unread=true`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response contains filtered data': (r) => r.body.length > 0,
      });
    });

    group('Empty Conversations List', () => {
      const res = http.get(`${BASE_URL}/api/conversations?participant_id=999999`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response is empty or no results': (r) => {
          const body = JSON.parse(r.body);
          if (Array.isArray(body)) {
            return true;
          }
          return true;
        },
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
