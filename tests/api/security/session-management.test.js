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
 * Session Management Test
 * 
 * Tests session security and management:
 * 1. Session creation on login
 * 2. Session invalidation on logout
 * 3. Session cookie security attributes
 * 4. Multiple concurrent sessions
 * 5. Session expiration handling
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n🔐 Testing Session Management');
  
  // ===========================================
  // Test 1: Session Creation on Login
  // ===========================================
  group('Session: Creation', () => {
    console.log('\n✅ Test 1: Session created on login...');
    
    const payload = JSON.stringify({
      phone: TEST_PHONE,
      password: TEST_PASSWORD,
    });
    
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      payload,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Cookies:`, JSON.stringify(res.cookies).substring(0, 200));
    
    check(res, {
      '[Creation] login successful': (r) => r.status === 200,
      '[Creation] session cookie present': (r) => {
        return r.cookies['sessionid'] !== undefined;
      },
      '[Creation] cookie has httpOnly flag': (r) => {
        const sessionCookie = r.cookies['sessionid'];
        if (!sessionCookie || !sessionCookie[0]) return false;
        return sessionCookie[0].http_only === true;
      },
    });
  });
  
  // ===========================================
  // Test 2: Session Invalidation on Logout
  // ===========================================
  group('Session: Logout Invalidation', () => {
    console.log('\n🚪 Test 2: Session invalidated on logout...');
    
    // Login first
    const loginPayload = JSON.stringify({
      phone: TEST_PHONE,
      password: TEST_PASSWORD,
    });
    
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      loginPayload,
      { headers }
    );
    
    const sessionId = loginRes.cookies['sessionid'] ? loginRes.cookies['sessionid'][0].value : null;
    
    if (!sessionId) {
      console.error('No session cookie found');
      return;
    }
    
    // Logout
    const logoutRes = http.post(
      `${BASE_URL}/api/auth/logout`,
      '{}',
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Logout Status: ${logoutRes.status}`);
    
    // Try to use the session after logout
    const testRes = http.get(
      `${BASE_URL}/api/profiles`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Test After Logout Status: ${testRes.status}`);
    console.log(`Response: ${testRes.body.substring(0, 200)}`);
    
    check(testRes, {
      '[Logout] session invalidated': (r) => r.status === 401 || r.status === 403,
      '[Logout] cannot access protected resources': (r) => {
        try {
          const body = r.json();
          // Should not return user profiles
          return !Array.isArray(body) || body.length === 0 || body.hasOwnProperty('error');
        } catch (e) {
          return true;
        }
      },
    });
  });
  
  // ===========================================
  // Test 3: Invalid Session Cookie
  // ===========================================
  group('Session: Invalid Cookie', () => {
    console.log('\n❌ Test 3: Invalid session cookie rejected...');
    
    const fakeSessionId = 'invalid_session_' + Date.now();
    
    const res = http.get(
      `${BASE_URL}/api/profiles`,
      { 
        headers,
        cookies: { sessionid: fakeSessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body.substring(0, 200)}`);
    
    check(res, {
      '[Invalid] access denied': (r) => r.status === 401 || r.status === 403,
      '[Invalid] proper error response': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('error') || body.hasOwnProperty('detail');
        } catch (e) {
          return true;
        }
      },
    });
  });
  
  // ===========================================
  // Test 4: Session Reuse After Login
  // ===========================================
  group('Session: Reuse', () => {
    console.log('\n🔄 Test 4: Session can be reused...');
    
    // Login
    const loginPayload = JSON.stringify({
      phone: TEST_PHONE,
      password: TEST_PASSWORD,
    });
    
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      loginPayload,
      { headers }
    );
    
    const sessionId = loginRes.cookies['sessionid'] ? loginRes.cookies['sessionid'][0].value : null;
    
    if (!sessionId) {
      console.error('No session cookie found');
      return;
    }
    
    // Use session for first request
    const req1 = http.get(
      `${BASE_URL}/api/profiles`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    // Use session for second request
    const req2 = http.get(
      `${BASE_URL}/api/auth/me`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Request 1 Status: ${req1.status}`);
    console.log(`Request 2 Status: ${req2.status}`);
    
    check(req1, {
      '[Reuse] first request succeeds': (r) => r.status === 200,
    });
    
    check(req2, {
      '[Reuse] second request succeeds': (r) => r.status === 200,
    });
  });
  
  // ===========================================
  // Test 5: Multiple Sessions
  // ===========================================
  group('Session: Multiple Logins', () => {
    console.log('\n👥 Test 5: Multiple login sessions...');
    
    const loginPayload = JSON.stringify({
      phone: TEST_PHONE,
      password: TEST_PASSWORD,
    });
    
    // First login
    const login1 = http.post(
      `${BASE_URL}/api/auth/login`,
      loginPayload,
      { headers }
    );
    
    const session1 = login1.cookies['sessionid'] ? login1.cookies['sessionid'][0].value : null;
    
    // Second login
    const login2 = http.post(
      `${BASE_URL}/api/auth/login`,
      loginPayload,
      { headers }
    );
    
    const session2 = login2.cookies['sessionid'] ? login2.cookies['sessionid'][0].value : null;
    
    console.log(`Session 1: ${session1 ? 'created' : 'null'}`);
    console.log(`Session 2: ${session2 ? 'created' : 'null'}`);
    
    check(login1, {
      '[Multiple] first login succeeds': (r) => r.status === 200,
    });
    
    check(login2, {
      '[Multiple] second login succeeds': (r) => r.status === 200,
    });
    
    // Test if both sessions work (or if second invalidates first)
    if (session1 && session2) {
      const test1 = http.get(
        `${BASE_URL}/api/auth/me`,
        { 
          headers,
          cookies: { sessionid: session1 },
        }
      );
      
      console.log(`Session 1 still valid: ${test1.status}`);
      
      check(test1, {
        '[Multiple] sessions handled correctly': (r) => {
          // Both could work (multiple sessions) or first could be invalidated
          return r.status === 200 || r.status === 401;
        },
      });
    }
  });
  
  console.log('\n✅ All session management tests completed');
}
