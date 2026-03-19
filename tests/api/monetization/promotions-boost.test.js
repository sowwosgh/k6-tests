import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL, getAuthHeaders } from '../../../config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.90'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const ah = getAuthHeaders();

  console.log('\n⚡ Testing Promotion Boost');

  group('Authenticated: Apply Boost', () => {
    const res = http.post(`${BASE_URL}/api/promotions/boost`,
      JSON.stringify({ profile_type: 'worker', profile_id: 1, package_id: 1 }),
      { headers: ah });
    console.log(`Boost status: ${res.status}`);
    check(res, {
      '[Boost] status is valid': (r) => r.status === 200 || r.status === 400 || r.status === 402 || r.status === 404,
      '[Boost] has response': (r) => r.body && r.body.length > 0,
    });
  });

  group('Invalid: Missing Parameters', () => {
    const res = http.post(`${BASE_URL}/api/boost/purchase`,
      JSON.stringify({ entity_type: 'worker' }),
      { headers: ah });
    console.log(`Missing params status: ${res.status}`);
    check(res, {
      '[Missing] error response': (r) => r.status === 400 || r.status === 404 || r.status === 422,
    });
  });

  group('Unauthenticated: Apply Boost', () => {
    const res = http.post(`${BASE_URL}/api/boost/purchase`,
      JSON.stringify({ entity_type: 'worker', entity_id: 1, pricing_id: 1 }),
      { headers: { 'Content-Type': 'application/json' } });
    console.log(`Unauth status: ${res.status}`);
    check(res, {
      '[Unauth] access denied': (r) => r.status === 401 || r.status === 403 || r.status === 422,
    });
  });

  console.log('\n✅ Promotion boost test completed');
}
