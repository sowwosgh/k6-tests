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
 * Contact Purchase Test
 * 
 * Tests contact purchase via balance (POST /api/purchase-contact):
 * 1. Purchase contacts using balance
 * 2. Purchase with payment (test mode)
 * 3. Invalid profile handling
 * 4. Authentication required
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n💳 Testing Contact Purchase');
  
  // ===========================================
  // Test 1: Purchase with Balance (Authenticated)
  // ===========================================
  group('Authenticated: Purchase with Balance', () => {
    console.log('\n✅ Test 1: Purchase contact access with balance...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    // Try to purchase access to a worker profile
    const payload = JSON.stringify({
      profile_type: 'worker',
      profile_id: 1,
      use_balance: true,
    });
    
    const res = http.post(
      `${BASE_URL}/api/purchase-contact`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Balance] request processed': (r) => r.status === 200 || r.status === 400 || r.status === 402,
      '[Balance] response is valid': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
      '[Balance] has proper structure': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('ok') || body.hasOwnProperty('error') || body.hasOwnProperty('detail');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Purchase with Payment
  // ===========================================  
  group('Authenticated: Purchase with Payment', () => {
    console.log('\n💰 Test 2: Purchase contact access with payment...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      profile_type: 'employer',
      profile_id: 1,
      use_balance: false, // Try to pay with money
    });
    
    const res = http.post(
      `${BASE_URL}/api/purchase-contact`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Payment] request processed': (r) => r.status === 200 || r.status === 400,
      '[Payment] response is valid': (r) => {
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
  // Test 3: Invalid Profile
  // ===========================================
  group('Authenticated: Invalid Profile', () => {
    console.log('\n⚠️  Test 3: Purchase non-existent profile...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      profile_type: 'worker',
      profile_id: 999999,
      use_balance: true,
    });
    
    const res = http.post(
      `${BASE_URL}/api/purchase-contact`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Invalid] error status': (r) => r.status === 404 || r.status === 400,
      '[Invalid] error response': (r) => {
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
  // Test 4: Unauthenticated Access
  // ===========================================
  group('Unauthenticated: Purchase Access', () => {
    console.log('\n🔒 Test 4: Unauthenticated purchase...');
    
    const payload = JSON.stringify({
      profile_type: 'worker',
      profile_id: 1,
      use_balance: true,
    });
    
    const res = http.post(
      `${BASE_URL}/api/purchase-contact`,
      payload,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Unauth] access denied': (r) => r.status === 401 || r.status === 400,
      '[Unauth] error response': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('detail') || body.hasOwnProperty('error');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ Contact purchase test completed\n');
}
