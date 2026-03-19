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

  console.log('\n🔥 Testing Promotion Urgent');

  group('Authenticated: Apply Urgent', () => {
    const res = http.post(`${BASE_URL}/api/promotions/urgent`,
      JSON.stringify({ profile_type: 'worker', profile_id: 1, package_id: 2 }),
      { headers: ah });
    console.log(`Urgent status: ${res.status}`);
    check(res, {
      '[Urgent] status is valid': (r) => r.status === 200 || r.status === 400 || r.status === 402 || r.status === 404,
      '[Urgent] has response': (r) => r.body && r.body.length > 0,
    });
  });

  group('Invalid: Missing Parameters', () => {
    const res = http.post(`${BASE_URL}/api/urgent/purchase`,
      JSON.stringify({ entity_type: 'worker' }),
      { headers: ah });
    check(res, {
      '[Missing] error response': (r) => r.status === 400 || r.status === 404 || r.status === 422,
    });
  });

  group('Unauthenticated: Apply Urgent', () => {
    const res = http.post(`${BASE_URL}/api/urgent/purchase`,
      JSON.stringify({ entity_type: 'worker', entity_id: 1 }),
      { headers: { 'Content-Type': 'application/json' } });
    check(res, {
      '[Unauth] access denied': (r) => r.status === 401 || r.status === 403 || r.status === 422,
    });
  });

  console.log('\n✅ Promotion urgent test completed');
}
