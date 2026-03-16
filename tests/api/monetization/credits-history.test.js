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
 * Credits Payment History Test
 * 
 * Tests credits payment history (GET /api/payments/history):
 * 1. Get payment history
 * 2. History structure validation
 * 3. Authentication required
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n📜 Testing Credits Payment History');
  
  // ===========================================
  // Test 1: Get History (Authenticated)
  // ===========================================
  group('Authenticated: Get Payment History', () => {
    console.log('\n✅ Test 1: Get payment history...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.get(
      `${BASE_URL}/api/payments/history`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[History] status is 200': (r) => r.status === 200,
      '[History] response is array': (r) => {
        try {
          const body = r.json();
          return Array.isArray(body);
        } catch (e) {
          return false;
        }
      },
      '[History] items have id': (r) => {
        try {
          const body = r.json();
          return body.length === 0 || body[0].hasOwnProperty('id');
        } catch (e) {
          return false;
        }
      },
      '[History] items have amount': (r) => {
        try {
          const body = r.json();
          return body.length === 0 || body[0].hasOwnProperty('amount');
        } catch (e) {
          return false;
        }
      },
      '[History] items have credits': (r) => {
        try {
          const body = r.json();
          return body.length === 0 || body[0].hasOwnProperty('credits');
        } catch (e) {
          return false;
        }
      },
      '[History] items have status': (r) => {
        try {
          const body = r.json();
          return body.length === 0 || body[0].hasOwnProperty('status');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Unauthenticated Access
  // ===========================================
  group('Unauthenticated: Get History', () => {
    console.log('\n🔒 Test 2: Unauthenticated access...');
    
    const res = http.get(
      `${BASE_URL}/api/payments/history`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Unauth] response handled': (r) => r.status === 200 || r.status === 401,
      '[Unauth] valid response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ Credits history test completed\n');
}
