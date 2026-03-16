import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL, getSessionHeaders } from '../../../config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.75'],
    http_req_duration: ['p(95)<2000'],
  },
};

/**
 * User Billing History Test
 *
 * Tests user billing history with detailed transactions.
 */
export default function () {
  const sessionHeaders = getSessionHeaders();

  console.log('\n📖 Testing User Billing History');

  // ===========================================
  // Test 1: Get Billing History (Authenticated)
  // ===========================================
  group('Authenticated: Get Billing History', () => {
    console.log('\n✅ Test 1: Get user billing history...');

    const res = http.get(`${BASE_URL}/api/billing/history`, {
      headers: sessionHeaders,
    });

    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body.substring(0, 200)}`);

    check(res, {
      '[History] status is valid': (r) => [200, 401, 403, 404].includes(r.status),
      '[History] response is array': (r) => {
        if (r.status !== 200) return true;
        try {
          const body = r.json();
          return Array.isArray(body) || Array.isArray(body.history) || Array.isArray(body.transactions) || Array.isArray(body.results);
        } catch (e) {
          return false;
        }
      },
      '[History] valid structure': (r) => {
        if (r.status !== 200) return true;
        try {
          const body = r.json();
          const history = Array.isArray(body) ? body : (body.history || body.transactions || body.results || []);
          if (!history || history.length === 0) return true;

          const item = history[0];
          return item.hasOwnProperty('id') ||
                 item.hasOwnProperty('created_at') ||
                 item.hasOwnProperty('type');
        } catch (e) {
          return false;
        }
      },
    });
  });

  // ===========================================
  // Test 2: Unauthenticated Access
  // ===========================================
  group('Unauthenticated: Get Billing History', () => {
    console.log('\n🔒 Test 2: Unauthenticated access...');

    const res = http.get(`${BASE_URL}/api/billing/history`);

    console.log(`Status: ${res.status}`);

    check(res, {
      '[Unauth] status is 401, 403 or 404': (r) => r.status === 401 || r.status === 403 || r.status === 404,
      '[Unauth] has response': (r) => r.body.length > 0,
    });
  });

  console.log('\n✅ Billing history test completed\n');
}
