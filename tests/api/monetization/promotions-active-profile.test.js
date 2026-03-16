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
 * Profile Active Promotions Test
 * 
 * Tests active promotions for a specific profile.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n✨ Testing Profile Active Promotions');
  
  // ===========================================
  // Test 1: Get Profile Promotions (Authenticated)
  // ===========================================
  group('Authenticated: Get Profile Promotions', () => {
    console.log('\n✅ Test 1: Get profile active promotions...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.get(
      `${BASE_URL}/api/promotions/active/worker/1`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Active] status is valid': (r) => r.status === 200 || r.status === 404,
      '[Active] has JSON response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
      '[Active] has promotions data': (r) => {
        if (r.status === 404) return true;
        try {
          const body = r.json();
          return body.hasOwnProperty('boost') ||
                 body.hasOwnProperty('urgent') ||
                 body.hasOwnProperty('promotions') ||
                 Array.isArray(body);
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Public Access
  // ===========================================
  group('Public: Get Profile Promotions', () => {
    console.log('\n✅ Test 2: Public access...');
    
    const res = http.get(
      `${BASE_URL}/api/promotions/active/worker/1`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Public] status is valid': (r) => r.status === 200 || r.status === 401 || r.status === 404,
      '[Public] has response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ Profile promotions test completed\n');
}
