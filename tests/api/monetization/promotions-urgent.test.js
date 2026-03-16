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
 * Promotion Urgent Test
 * 
 * Tests urgent profile promotion (POST /api/promotions/urgent):
 * 1. Apply urgent status to profile
 * 2. Urgent validation
 * 3. Payment handling
 * 4. Authentication required
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n🔥 Testing Promotion Urgent');
  
  // ===========================================
  // Test 1: Apply Urgent (Authenticated)
  // ===========================================
  group('Authenticated: Apply Urgent', () => {
    console.log('\n✅ Test 1: Apply urgent to profile...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      profile_type: 'worker',
      profile_id: 1,
      package_id: 2,
    });
    
    const res = http.post(
      `${BASE_URL}/api/promotions/urgent`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Urgent] status is valid': (r) => r.status === 200 || r.status === 400 || r.status === 402,
      '[Urgent] has JSON response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
      '[Urgent] has status field': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('success') || 
                 body.hasOwnProperty('error') || 
                 body.hasOwnProperty('detail');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Invalid Profile
  // ===========================================
  group('Invalid: Profile', () => {
    console.log('\n❌ Test 2: Invalid profile...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      entity_type: 'invalid',
      entity_id: 99999,
    });
    
    const res = http.post(
      `${BASE_URL}/api/urgent/purchase`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Invalid] error response': (r) => r.status === 400 || r.status === 404 || r.status === 422,
      '[Invalid] has error message': (r) => {
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
  // Test 3: Missing Parameters
  // ===========================================
  group('Invalid: Missing Parameters', () => {
    console.log('\n❌ Test 3: Missing parameters...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      entity_type: 'worker',
    });
    
    const res = http.post(
      `${BASE_URL}/api/urgent/purchase`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Missing] error response': (r) => r.status === 400 || r.status === 422,
      '[Missing] has error': (r) => {
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
  group('Unauthenticated: Apply Urgent', () => {
    console.log('\n🔒 Test 4: Unauthenticated access...');
    
    const payload = JSON.stringify({
      entity_type: 'worker',
      entity_id: 1,
    });
    
    const res = http.post(
      `${BASE_URL}/api/urgent/purchase`,
      payload,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Unauth] access denied': (r) => r.status === 401 || r.status === 403,
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
  
  console.log('\n✅ Promotion urgent test completed\n');
}
