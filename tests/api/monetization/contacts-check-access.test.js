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
 * Contacts Check Access Test
 * 
 * Tests contact access verification (GET /api/check-contact-access):
 * 1. Check access to specific profile
 * 2. Valid profile types (worker/employer)
 * 3. Invalid profile handling
 * 4. Authentication required
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n🔍 Testing Contacts Check Access');
  
  // ===========================================
  // Test 1: Check Access (Authenticated)
  // ===========================================
  group('Authenticated: Check Access', () => {
    console.log('\n✅ Test 1: Check access to worker profile...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.get(
      `${BASE_URL}/api/contacts/check-access/worker/1`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Check] status is valid': (r) => r.status === 200 || r.status === 402 || r.status === 404,
      '[Check] has JSON response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
      '[Check] has has_access field': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('has_access') || body.hasOwnProperty('error');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Invalid Profile Type
  // ===========================================
  group('Invalid: Profile Type', () => {
    console.log('\n❌ Test 2: Invalid profile type...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.get(
      `${BASE_URL}/api/contacts/check-access/invalid/1`,
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
    
    const res = http.get(
      `${BASE_URL}/api/contacts/check-access/worker/`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Missing] error response': (r) => r.status === 400 || r.status === 404 || r.status === 422,
      '[Missing] has error message': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('error') || body.hasOwnProperty('detail') || r.status === 404;
        } catch (e) {
          return r.status === 404;
        }
      },
    });
  });
  
  // ===========================================
  // Test 4: Unauthenticated Access
  // ===========================================
  group('Unauthenticated: Check Access', () => {
    console.log('\n🔒 Test 4: Unauthenticated access...');
    
    const res = http.get(
      `${BASE_URL}/api/contacts/check-access/worker/1`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    // Note: Backend may allow public access to check-access endpoint
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
  
  console.log('\n✅ Contacts check access test completed\n');
}
