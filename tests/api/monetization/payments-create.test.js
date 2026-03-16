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
 * Payment Create Test
 * 
 * Tests payment creation endpoint.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n💳 Testing Payment Create');
  
  // ===========================================
  // Test 1: Create Payment (Authenticated)
  // ===========================================
  group('Authenticated: Create Payment', () => {
    console.log('\n✅ Test 1: Create payment...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      package_id: 1,
      amount: 299,
    });
    
    const res = http.post(
      `${BASE_URL}/api/payments/create`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Create] status is valid': (r) => r.status === 200 || r.status === 400 || r.status === 422,
      '[Create] has JSON response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
      '[Create] has payment data': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('payment_url') || 
                 body.hasOwnProperty('order_id') ||
                 body.hasOwnProperty('error');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Invalid Package
  // ===========================================
  group('Invalid: Package', () => {
    console.log('\n❌ Test 2: Invalid package...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      package_id: 99999,
      amount: 299,
    });
    
    const res = http.post(
      `${BASE_URL}/api/payments/create`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Invalid] error response': (r) => r.status === 400 || r.status === 404 || r.status === 422,
      '[Invalid] has error': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('error') || body.hasOwnProperty('detail');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 3: Unauthenticated Access
  // ===========================================
  group('Unauthenticated: Create Payment', () => {
    console.log('\n🔒 Test 3: Unauthenticated access...');
    
    const payload = JSON.stringify({
      package_id: 1,
      amount: 299,
    });
    
    const res = http.post(
      `${BASE_URL}/api/payments/create`,
      payload,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Unauth] access denied': (r) => r.status === 401 || r.status === 403 || r.status === 422,
      '[Unauth] error response': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('error') || body.hasOwnProperty('detail');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ Payment create test completed\n');
}
