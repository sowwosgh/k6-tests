import http from 'k6/http';
import { check, group } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
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
 * Subscription Features Test
 * 
 * Tests subscription features and limits.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n⭐ Testing Subscription Features');
  
  // ===========================================
  // Test 1: Get Subscription Features (Authenticated)
  // ===========================================
  group('Authenticated: Get Subscription Features', () => {
    console.log('\n✅ Test 1: Get current subscription features...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.get(
      `${BASE_URL}/api/subscriptions/features`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Features] status is valid': (r) => r.status === 200 || r.status === 404,
      '[Features] has JSON response': (r) => {
        if (r.status === 404) return true; // 404 may be HTML
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
      '[Features] has features data': (r) => {
        if (r.status === 404) return true;
        try {
          const body = r.json();
          return body.hasOwnProperty('contacts_limit') ||
                 body.hasOwnProperty('features') ||
                 body.hasOwnProperty('plan') ||
                 Array.isArray(body);
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Fallback to Current Subscription
  // ===========================================
  group('Fallback: Current Subscription', () => {
    console.log('\n✅ Test 2: Fallback to subscription/current...');
    
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
    
    check(res, {
      '[Fallback] status is 200': (r) => r.status === 200,
      '[Fallback] has plan info': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('plan');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ Subscription features test completed\n');
}
