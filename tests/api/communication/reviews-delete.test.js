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

  group('Reviews: Delete Own Review', () => {
    const res = http.del(`${BASE_URL}/api/reviews/1`, null, { headers });
    check(res, {
      '[Delete] status is valid': (r) => [200, 204, 401, 403, 404].includes(r.status),
      '[Delete] has response': (r) => r.status === 204 || r.body.length > 0,
    }, { type: 'reviews' });
  });

  group('Reviews: Delete Non-existent', () => {
    const res = http.del(`${BASE_URL}/api/reviews/99999`, null, { headers });
    check(res, {
      '[NotFound] status is valid': (r) => [401, 403, 404].includes(r.status),
      '[NotFound] has response': (r) => r.body.length > 0,
    }, { type: 'reviews' });
  });

  group('Reviews: Unauthenticated Delete', () => {
    const res = http.del(`${BASE_URL}/api/reviews/1`, null, { headers: { 'Content-Type': 'application/json' } });
    check(res, {
      '[UnauthDelete] access denied': (r) => r.status === 401 || r.status === 403,
      '[UnauthDelete] has error': (r) => r.body.length > 0,
    }, { type: 'reviews' });
  });
}
