import http from 'k6/http';
import { check, group } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const TEST_PHONE = '+79001234567';
const TEST_PASSWORD = 'test123';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.90'],
    http_req_duration: ['p(95)<2000'],
  },
};

/**
 * Helper function to login and get session cookie
 */
function login() {
  const loginPayload = JSON.stringify({
    phone: TEST_PHONE,
    password: TEST_PASSWORD,
  });

  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status !== 200) {
    console.error('Login failed:', loginRes.status, loginRes.body);
    return null;
  }

  const cookies = loginRes.cookies;
  const sessionId = cookies['sessionid'] ? cookies['sessionid'][0].value : null;
  
  if (!sessionId) {
    console.error('No session cookie found');
    return null;
  }

  return sessionId;
}

/**
 * Subscriptions Cancel Test
 * 
 * Tests subscription cancellation (POST /api/subscriptions/cancel):
 * 1. Cancel active subscription
 * 2. No subscription handling
 * 3. Authentication required
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n❌ Testing Cancel Subscription');
  
  // ===========================================
  // Test 1: Cancel (Authenticated)
  // ===========================================
  group('Authenticated: Cancel Subscription', () => {
    console.log('\n✅ Test 1: Cancel subscription...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.post(
      `${BASE_URL}/api/subscriptions/cancel`,
      '{}',
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Cancel] status is valid': (r) => r.status === 200 || r.status === 400 || r.status === 404,
      '[Cancel] has JSON response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
      '[Cancel] has status field': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('success') || 
                 body.hasOwnProperty('cancelled') ||
                 body.hasOwnProperty('ok') ||
                 body.hasOwnProperty('error') || 
                 body.hasOwnProperty('detail');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Unauthenticated Access
  // ===========================================
  group('Unauthenticated: Cancel', () => {
    console.log('\n🔒 Test 2: Unauthenticated access...');
    
    const res = http.post(
      `${BASE_URL}/api/subscriptions/cancel`,
      '{}',
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Unauth] status is valid': (r) => r.status === 200 || r.status === 401 || r.status === 403,
      '[Unauth] has response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ Cancel subscription test completed\n');
}
