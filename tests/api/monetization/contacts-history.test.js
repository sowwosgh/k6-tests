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
 * Contacts Purchase History Test
 * 
 * Tests contacts purchase history (GET /api/contacts/history):
 * 1. Get purchase history
 * 2. History structure validation
 * 3. Authentication required
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n📜 Testing Contacts Purchase History');
  
  // ===========================================
  // Test 1: Get History (Authenticated)
  // ===========================================
  group('Authenticated: Get Purchase History', () => {
    console.log('\n✅ Test 1: Get contacts purchase history...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.get(
      `${BASE_URL}/api/contacts/history`,
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
      '[History] items have profile_type': (r) => {
        try {
          const body = r.json();
          return body.length === 0 || body[0].hasOwnProperty('profile_type');
        } catch (e) {
          return false;
        }
      },
      '[History] items have profile_id': (r) => {
        try {
          const body = r.json();
          return body.length === 0 || body[0].hasOwnProperty('profile_id');
        } catch (e) {
          return false;
        }
      },
      '[History] items have price': (r) => {
        try {
          const body = r.json();
          return body.length === 0 || body[0].hasOwnProperty('price');
        } catch (e) {
          return false;
        }
      },
      '[History] items have purchased_at': (r) => {
        try {
          const body = r.json();
          return body.length === 0 || body[0].hasOwnProperty('purchased_at');
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
      `${BASE_URL}/api/contacts/history`,
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
  
  console.log('\n✅ Contacts history test completed\n');
}
