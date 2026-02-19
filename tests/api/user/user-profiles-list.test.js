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
    http_req_duration: ['p(95)<1000'],
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
 * User Profiles List Test
 * 
 * Tests user profiles retrieval (GET /api/profiles):
 * 1. Authenticated: Get all profiles for user
 * 2. Unauthenticated: Must return 401
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n👤 Testing User Profiles List');
  
  // ===========================================
  // Test 1: Get Profiles (Authenticated)
  // ===========================================
  group('Authenticated: Get Profiles', () => {
    console.log('\n✅ Test 1: Get user profiles...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.get(
      `${BASE_URL}/api/profiles`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Profiles] status is 200': (r) => r.status === 200,
      '[Profiles] response is array': (r) => {
        try {
          const body = r.json();
          return Array.isArray(body);
        } catch (e) {
          return false;
        }
      },
      '[Profiles] array has items': (r) => {
        try {
          const body = r.json();
          return body.length > 0;
        } catch (e) {
          return false;
        }
      },
      '[Profiles] items have type field': (r) => {
        try {
          const body = r.json();
          if (!Array.isArray(body) || body.length === 0) return false;
          return body[0].hasOwnProperty('type');
        } catch (e) {
          return false;
        }
      },
      '[Profiles] items have id field': (r) => {
        try {
          const body = r.json();
          if (!Array.isArray(body) || body.length === 0) return false;
          return body[0].hasOwnProperty('id');
        } catch (e) {
          return false;
        }
      },
      '[Profiles] items have name field': (r) => {
        try {
          const body = r.json();
          if (!Array.isArray(body) || body.length === 0) return false;
          return body[0].hasOwnProperty('name');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Unauthenticated Request
  // ===========================================
  group('Unauthenticated: Must Fail', () => {
    console.log('\n🔒 Test 2: Unauthenticated request...');
    
    // Explicitly pass empty cookies to ensure no session is used
    const jar = http.cookieJar();
    jar.clear(BASE_URL);
    
    const res = http.get(
      `${BASE_URL}/api/profiles`,
      { 
        headers,
        jar,
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Unauth] status is 401 or 403': (r) => r.status === 401 || r.status === 403,
    });
  });
  
  console.log('\n✅ All profiles list tests completed');
}
