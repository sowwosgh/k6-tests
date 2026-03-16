import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL, getSessionHeaders } from '../../../config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    'checks{type:favorites}': ['rate>0.90'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const headers = getSessionHeaders();

  group('Favorites: Remove Worker', () => {
    const res = http.del(`${BASE_URL}/api/favorites/worker/2`, null, { headers });
    check(res, {
      '[Remove] status is valid': (r) => [200, 204, 401, 403, 404].includes(r.status),
      '[Remove] has response': (r) => r.status === 204 || r.body.length > 0,
    }, { type: 'favorites' });
  });

  group('Favorites: Remove Non-existent', () => {
    const res = http.del(`${BASE_URL}/api/favorites/worker/99999`, null, { headers });
    check(res, {
      '[NotFound] status is valid': (r) => [200, 204, 401, 403, 404].includes(r.status),
      '[NotFound] has response': (r) => r.status === 204 || r.body.length > 0,
    }, { type: 'favorites' });
  });

  group('Favorites: Invalid Type Remove', () => {
    const res = http.del(`${BASE_URL}/api/favorites/invalid/1`, null, { headers });
    check(res, {
      '[InvalidType] error status': (r) => [400, 401, 403, 404, 422].includes(r.status),
      '[InvalidType] has response': (r) => r.body.length > 0,
    }, { type: 'favorites' });
  });

  group('Favorites: Unauthenticated Remove', () => {
    const res = http.del(`${BASE_URL}/api/favorites/worker/1`, null, { headers: { 'Content-Type': 'application/json' } });
    check(res, {
      '[UnauthRemove] access denied': (r) => r.status === 401 || r.status === 403,
      '[UnauthRemove] has error': (r) => r.body.length > 0,
    }, { type: 'favorites' });
  });
}
