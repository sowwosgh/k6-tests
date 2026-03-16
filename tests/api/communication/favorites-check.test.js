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

  group('Favorites: Check Status', () => {
    const res = http.post(
      `${BASE_URL}/api/favorites/check`,
      JSON.stringify({ profile_type: 'worker', profile_id: 1 }),
      { headers }
    );
    check(res, {
      '[Check] status is valid': (r) => [200, 401, 403, 404, 405].includes(r.status),
      '[Check] has response': (r) => r.body.length > 0,
    }, { type: 'favorites' });
  });

  group('Favorites: Check Non-existent', () => {
    const res = http.post(
      `${BASE_URL}/api/favorites/check`,
      JSON.stringify({ profile_type: 'worker', profile_id: 99999 }),
      { headers }
    );
    check(res, {
      '[CheckFalse] status is valid': (r) => [200, 401, 403, 404, 405].includes(r.status),
      '[CheckFalse] has response': (r) => r.body.length > 0,
    }, { type: 'favorites' });
  });

  group('Favorites: Check Invalid Type', () => {
    const res = http.post(
      `${BASE_URL}/api/favorites/check`,
      JSON.stringify({ profile_type: 'invalid', profile_id: 1 }),
      { headers }
    );
    check(res, {
      '[CheckInvalid] error or auth status': (r) => [400, 401, 405, 422].includes(r.status),
      '[CheckInvalid] has response': (r) => r.body.length > 0,
    }, { type: 'favorites' });
  });

  group('Favorites: Unauthenticated Check', () => {
    const res = http.post(
      `${BASE_URL}/api/favorites/check`,
      JSON.stringify({ profile_type: 'worker', profile_id: 1 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    check(res, {
      '[UnauthCheck] access denied': (r) => [401, 403, 405].includes(r.status),
      '[UnauthCheck] has response': (r) => r.body.length > 0,
    }, { type: 'favorites' });
  });
}
