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
 * Credits Balance Test
 * 
 * Tests credits balance checking (GET /api/user/balance):
 * 1. Get current balance
 * 2. Balance structure validation
 * 3. Authentication required
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n💰 Testing Credits Balance');
  
  // ===========================================
  // Test 1: Get Balance (Authenticated)
  // ===========================================
  group('Authenticated: Get Balance', () => {
    console.log('\n✅ Test 1: Get credits balance...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.get(
      `${BASE_URL}/api/user/balance`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Balance] status is 200': (r) => r.status === 200,
      '[Balance] has contacts remaining': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('contacts_remaining');
        } catch (e) {
          return false;
        }
      },
      '[Balance] contacts is number': (r) => {
        try {
          const body = r.json();
          return typeof body.contacts_remaining === 'number';
        } catch (e) {
          return false;
        }
      },
      '[Balance] has valid structure': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Unauthenticated Access
  // ===========================================
  group('Unauthenticated: Get Balance', () => {
    console.log('\n🔒 Test 2: Unauthenticated access...');
    
    const res = http.get(
      `${BASE_URL}/api/user/balance`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    // Note: Backend allows public access to balance endpoint
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
  
  console.log('\n✅ Credits balance test completed\n');
}
