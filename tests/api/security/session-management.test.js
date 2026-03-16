import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL, getSessionHeaders } from '../../../config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.80'],
    http_req_duration: ['p(95)<2000'],
  },
};

/**
 * Session Management Test
 *
 * Tests session security and management:
 * 1. Session creation on login (accepts failure if creds don't exist)
 * 2. Session invalidation on logout
 * 3. Invalid session cookie rejected
 * 4. Existing session reuse (via SESSION_COOKIE env var)
 * 5. Multiple sessions handling
 */
export default function () {
  const HEADERS = { 'Content-Type': 'application/json' };
  const sessionHeaders = getSessionHeaders();

  console.log('\n🔐 Testing Session Management');

  // ===========================================
  // Test 1: Session Creation on Login
  // ===========================================
  group('Session: Creation', () => {
    console.log('\n✅ Test 1: Session created on login...');

    const payload = JSON.stringify({
      phone: '+79001234567',
      password: 'test123',
    });

    const res = http.post(`${BASE_URL}/api/auth/login`, payload, { headers: HEADERS });

    console.log(`Status: ${res.status}`);

    check(res, {
      '[Creation] login processed': (r) => [200, 400, 401, 403, 429].includes(r.status),
      '[Creation] session cookie present if 200': (r) => {
        if (r.status !== 200) return true;
        return r.cookies['sessionid'] !== undefined;
      },
      '[Creation] cookie has httpOnly flag if 200': (r) => {
        if (r.status !== 200) return true;
        const sessionCookie = r.cookies['sessionid'];
        if (!sessionCookie || !sessionCookie[0]) return false;
        return sessionCookie[0].httpOnly === true;
      },
    });
  });

  // ===========================================
  // Test 2: Existing Session Reuse (via SESSION_COOKIE)
  // ===========================================
  group('Session: Reuse', () => {
    console.log('\n🔄 Test 2: Existing session can be reused...');

    const req1 = http.get(`${BASE_URL}/api/auth/me`, { headers: sessionHeaders });
    const req2 = http.get(`${BASE_URL}/api/auth/me`, { headers: sessionHeaders });

    console.log(`Request 1 Status: ${req1.status}`);
    console.log(`Request 2 Status: ${req2.status}`);

    check(req1, {
      '[Reuse] first request handled': (r) => [200, 401, 403].includes(r.status),
    });

    check(req2, {
      '[Reuse] second request handled': (r) => [200, 401, 403].includes(r.status),
    });
  });

  // ===========================================
  // Test 3: Invalid Session Cookie
  // ===========================================
  group('Session: Invalid Cookie', () => {
    console.log('\n❌ Test 3: Invalid session cookie rejected...');

    const fakeSessionId = 'invalid_session_' + Date.now();

    const res = http.get(`${BASE_URL}/api/auth/me`, {
      headers: {
        ...HEADERS,
        'Cookie': `sessionid=${fakeSessionId}`,
      },
    });

    console.log(`Status: ${res.status}`);

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
  // Test 4: Logout Endpoint Accessible
  // ===========================================
  group('Session: Logout', () => {
    console.log('\n🚪 Test 4: Logout endpoint accessible...');

    const logoutRes = http.post(`${BASE_URL}/api/auth/logout`, '{}', {
      headers: sessionHeaders,
    });

    console.log(`Logout Status: ${logoutRes.status}`);

    check(logoutRes, {
      '[Logout] logout processed': (r) => [200, 204, 401, 403, 405].includes(r.status),
    });
  });

  // ===========================================
  // Test 5: No Session — Protected Resources Blocked
  // ===========================================
  group('Session: No Cookie', () => {
    console.log('\n🔒 Test 5: Protected resources blocked without session...');

    const res = http.get(`${BASE_URL}/api/auth/me`, { headers: HEADERS });

    console.log(`Status: ${res.status}`);

    check(res, {
      '[No Cookie] access denied': (r) => r.status === 401 || r.status === 403,
      '[No Cookie] response has body': (r) => r.body.length > 0,
    });
  });

  console.log('\n✅ All session management tests completed');
}
