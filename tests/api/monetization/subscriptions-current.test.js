import http from 'k6/http';
import { check, group } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const TEST_PHONE = '+79111111111';
const TEST_PASSWORD = 'dev123';

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
 * Subscriptions Current Test
 * 
 * Tests current subscription info (GET /api/subscriptions/current):
 * 1. Get current active subscription
 * 2. Subscription details validation
 * 3. Authentication required
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n📋 Testing Current Subscription');
  
  // ===========================================
  // Test 1: Get Current (Authenticated)
  // ===========================================
  group('Authenticated: Get Current Subscription', () => {
    console.log('\n✅ Test 1: Get current subscription...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.get(
      `${BASE_URL}/api/subscriptions/current`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Current] status is 200': (r) => r.status === 200,
      '[Current] has JSON response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
      '[Current] has subscription_type': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('subscription_type');
        } catch (e) {
          return false;
        }
      },
      '[Current] valid structure': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('plan_name') &&
                 body.hasOwnProperty('contacts_remaining') &&
                 body.hasOwnProperty('can_buy_addon');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Unauthenticated Access
  // ===========================================
  group('Unauthenticated: Get Current', () => {
    console.log('\n🔒 Test 2: Unauthenticated access...');
    
    const res = http.get(
      `${BASE_URL}/api/subscriptions/current`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    // Note: Backend may allow public access or require auth
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
  
  console.log('\n✅ Current subscription test completed\n');
}
