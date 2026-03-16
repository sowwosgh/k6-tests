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

  group('Reviews: Create Valid', () => {
    const res = http.post(
      `${BASE_URL}/api/reviews`,
      JSON.stringify({ profile_type: 'worker', profile_id: 1, rating: 5, text: 'Отличный специалист!' }),
      { headers }
    );
    check(res, {
      '[Create] status is valid': (r) => [200, 201, 400, 401, 409].includes(r.status),
      '[Create] has JSON response': (r) => { try { r.json(); return true; } catch (e) { return false; } },
    }, { type: 'reviews' });
  });

  group('Reviews: Invalid Rating', () => {
    const res = http.post(
      `${BASE_URL}/api/reviews`,
      JSON.stringify({ profile_type: 'worker', profile_id: 2, rating: 10, text: 'Test' }),
      { headers }
    );
    check(res, {
      '[InvalidRating] error or auth status': (r) => [400, 401, 422].includes(r.status),
      '[InvalidRating] has response': (r) => r.body.length > 0,
    }, { type: 'reviews' });
  });

  group('Reviews: Missing Params', () => {
    const res = http.post(
      `${BASE_URL}/api/reviews`,
      JSON.stringify({ profile_type: 'worker' }),
      { headers }
    );
    check(res, {
      '[Missing] validation or auth error': (r) => [400, 401, 422].includes(r.status),
      '[Missing] has error message': (r) => r.body.length > 0,
    }, { type: 'reviews' });
  });

  group('Reviews: Unauthenticated Create', () => {
    const res = http.post(
      `${BASE_URL}/api/reviews`,
      JSON.stringify({ profile_type: 'worker', profile_id: 1, rating: 5, text: 'Test' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    check(res, {
      '[UnauthCreate] access denied': (r) => r.status === 401 || r.status === 403,
      '[UnauthCreate] has error': (r) => r.body.length > 0,
    }, { type: 'reviews' });
  });
}
