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

  group('Favorites: Add Worker', () => {
    const res = http.post(
      `${BASE_URL}/api/favorites`,
      JSON.stringify({ profile_type: 'worker', profile_id: 1 }),
      { headers }
    );
    check(res, {
      '[AddWorker] status is valid': (r) => [200, 201, 400, 401, 409].includes(r.status),
      '[AddWorker] has JSON response': (r) => { try { r.json(); return true; } catch (e) { return false; } },
    }, { type: 'favorites' });
  });

  group('Favorites: Add Order', () => {
    const res = http.post(
      `${BASE_URL}/api/favorites`,
      JSON.stringify({ profile_type: 'order', profile_id: 1 }),
      { headers }
    );
    check(res, {
      '[AddOrder] status is valid': (r) => [200, 201, 400, 401, 409].includes(r.status),
      '[AddOrder] has response': (r) => r.body.length > 0,
    }, { type: 'favorites' });
  });

  group('Favorites: Invalid Type', () => {
    const res = http.post(
      `${BASE_URL}/api/favorites`,
      JSON.stringify({ profile_type: 'invalid', profile_id: 1 }),
      { headers }
    );
    check(res, {
      '[Invalid] error or auth status': (r) => [400, 401, 422].includes(r.status),
      '[Invalid] has response': (r) => r.body.length > 0,
    }, { type: 'favorites' });
  });

  group('Favorites: Unauthenticated', () => {
    const res = http.post(
      `${BASE_URL}/api/favorites`,
      JSON.stringify({ profile_type: 'worker', profile_id: 1 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    check(res, {
      '[Unauth] access denied': (r) => r.status === 401 || r.status === 403,
      '[Unauth] has error response': (r) => r.body.length > 0,
    }, { type: 'favorites' });
  });
}
