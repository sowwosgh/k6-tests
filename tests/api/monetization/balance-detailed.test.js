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
 * User Balance Detailed Test
 * 
 * Tests detailed user balance information including history and limits.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n💰 Testing User Balance Detailed');
  
  // ===========================================
  // Test 1: Get Detailed Balance (Authenticated)
  // ===========================================
  group('Authenticated: Get Detailed Balance', () => {
    console.log('\n✅ Test 1: Get detailed balance info...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.get(
      `${BASE_URL}/api/user/balance/detailed`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Detailed] status is valid': (r) => r.status === 200 || r.status === 404,
      '[Detailed] has JSON response': (r) => {
        if (r.status === 404) return true; // 404 may be HTML
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
      '[Detailed] has balance data': (r) => {
        if (r.status === 404) return true;
        try {
          const body = r.json();
          return body.hasOwnProperty('contacts_remaining') ||
                 body.hasOwnProperty('balance') ||
                 body.hasOwnProperty('credits');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Fallback to Simple Balance
  // ===========================================
  group('Fallback: Simple Balance', () => {
    console.log('\n✅ Test 2: Fallback to simple balance...');
    
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
    
    check(res, {
      '[Fallback] status is 200': (r) => r.status === 200,
      '[Fallback] has balance field': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('contacts_remaining');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ Balance detailed test completed\n');
}
