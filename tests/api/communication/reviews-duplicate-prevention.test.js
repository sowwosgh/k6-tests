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
  const payload = JSON.stringify({ profile_type: 'worker', profile_id: 1, rating: 5, text: 'Тест дубликата' });

  group('Reviews: First Submission', () => {
    const res = http.post(`${BASE_URL}/api/reviews`, payload, { headers });
    check(res, {
      '[First] status is valid': (r) => [200, 201, 400, 401, 409].includes(r.status),
      '[First] has response': (r) => r.body.length > 0,
    }, { type: 'reviews' });
  });

  group('Reviews: Duplicate Submission', () => {
    const res = http.post(`${BASE_URL}/api/reviews`, payload, { headers });
    check(res, {
      '[Duplicate] accepted or rejected': (r) => [200, 201, 400, 401, 409].includes(r.status),
      '[Duplicate] has response': (r) => r.body.length > 0,
    }, { type: 'reviews' });
  });

  group('Reviews: Unauthenticated', () => {
    const res = http.post(`${BASE_URL}/api/reviews`, payload, { headers: { 'Content-Type': 'application/json' } });
    check(res, {
      '[Unauth] access denied': (r) => r.status === 401 || r.status === 403,
      '[Unauth] has error': (r) => r.body.length > 0,
    }, { type: 'reviews' });
  });
}
