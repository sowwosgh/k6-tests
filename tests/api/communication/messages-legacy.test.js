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

  group('Messages - Legacy System Support', () => {
    group('Legacy Send Message Endpoint', () => {
      const payload = JSON.stringify({
        recipient_id: 2,
        message: 'Test legacy message',
      });

      const res = http.post(`${BASE_URL}/api/messages/send`, payload, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'status is 200, 201, or 404': (r) => r.status === 200 || r.status === 201 || r.status === 404,
        'valid response if supported': (r) => {
          if (r.status === 404) return true;
          return r.body.length > 0;
        },
      });
    });

    group('Legacy Get Messages Endpoint', () => {
      const res = http.get(`${BASE_URL}/api/messages`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
        'valid response structure': (r) => {
          if (r.status === 404) return true;
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('messages') || body.hasOwnProperty('results');
        },
      });
    });

    group('Legacy Inbox Endpoint', () => {
      const res = http.get(`${BASE_URL}/api/messages/inbox`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
        'valid response if supported': (r) => {
          if (r.status === 404) return true;
          return r.body.length > 0;
        },
      });
    });

    group('Legacy Sent Messages Endpoint', () => {
      const res = http.get(`${BASE_URL}/api/messages/sent`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
        'valid response if supported': (r) => {
          if (r.status === 404) return true;
          return r.body.length > 0;
        },
      });
    });

    group('Legacy vs Modern Endpoint Compatibility', () => {
      const modernRes = http.get(`${BASE_URL}/api/conversations`, {
        headers: authHeaders,
      });

      const legacyRes = http.get(`${BASE_URL}/api/messages`, {
        headers: authHeaders,
      });

      check(modernRes, {
        'modern endpoint accessible': (r) => r.status === 200,
      });

      check(legacyRes, {
        'legacy endpoint handled gracefully': (r) => r.status === 200 || r.status === 404,
      });
    });
  });
}
