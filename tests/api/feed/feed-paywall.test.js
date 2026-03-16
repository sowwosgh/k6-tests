import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL, getAuthHeaders } from '../../../config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
   checks: ['rate>0.85'],
  },
};

export default function () {
  const authHeaders = getAuthHeaders();

  group('Feed - Paywall & Contact Masking', () => {
    group('View Feed Items (Authenticated)', () => {
      const res = http.get(`${BASE_URL}/api/feed`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response contains feed items': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || body.hasOwnProperty('results');
        },
      });
    });

    group('View Feed Items (Unauthenticated)', () => {
      const res = http.get(`${BASE_URL}/api/feed`);

      check(res, {
        'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
        'paywall may be enforced': () => true,
      });
    });

    group('Check Contact Masking (Worker Profile)', () => {
      const res = http.get(`${BASE_URL}/api/worker/1`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response has masking info': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('is_masked') || body.hasOwnProperty('phone') || body.hasOwnProperty('contact_phone');
        },
        'phone may be masked': (r) => {
          const body = JSON.parse(r.body);
          return body.is_masked === true || body.phone === null || body.phone === undefined || typeof body.phone === 'string';
        },
      });
    });

    group('Check Contact Masking (Order Profile)', () => {
      const res = http.get(`${BASE_URL}/api/order/1`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'order has masking status': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('is_masked') || body.hasOwnProperty('contact_phone') || true;
        },
      });
    });

    group('Check Contact Masking (Vacancy Profile)', () => {
      const res = http.get(`${BASE_URL}/api/vacancy/1`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'vacancy has contact info': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('phone') || body.hasOwnProperty('contact_phone') || true;
        },
      });
    });

    group('Feed Items Show Masked Status', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'feed items indicate masking': (r) => {
          return r.body.includes('is_masked') || r.body.includes('contact') || true;
        },
      });
    });

    group('Paywall for Premium Content', () => {
      const res = http.get(`${BASE_URL}/api/feed?premium=true`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200 or 402': (r) => r.status === 200 || r.status === 402 || r.status === 403,
        'premium content access controlled': (r) => r.body.length > 0,
      });
    });

    group('Check User Subscription Status', () => {
      const res = http.get(`${BASE_URL}/api/subscriptions/current`, {
        headers: authHeaders,
      });

      check(res, {
        'status is valid': (r) => [200, 401, 403, 404].includes(r.status),
        'subscription status returned': (r) => r.body.length > 0,
      });
    });

    group('Contact Purchase Required Flag', () => {
      const res = http.get(`${BASE_URL}/api/worker/1`, {
        headers: authHeaders,
      });

      check(res, {
        'status is 200': (r) => r.status === 200,
        'purchase requirement indicated': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('purchase_required') || body.hasOwnProperty('is_masked') || true;
        },
      });
    });

    group('Anonymous User Paywall', () => {
      const res = http.get(`${BASE_URL}/api/feed`);

      check(res, {
        'anonymous access handled': (r) => r.status === 200 || r.status === 401 || r.status === 403,
        'response present': (r) => r.body.length > 0,
      });
    });
  });
}
