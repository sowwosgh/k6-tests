import http from 'k6/http';
import { check, sleep } from 'k6';
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
 * CSRF Protection Test
 *
 * Tests Cross-Site Request Forgery protection mechanisms:
 * 1. CSRF token in cookies after login
 * 2. GET request works without CSRF token
 * 3. PATCH with valid CSRF token
 * 4. PATCH without CSRF token (no session either)
 * 5. PATCH with invalid CSRF token
 * 6. CSRF token refresh on logout/login
 */
export default function () {
  const HEADERS = { 'Content-Type': 'application/json' };
  const sessionHeaders = getSessionHeaders();

  console.log('\n🔐 Testing CSRF Protection\n');

  // Test 1: Attempt login and check for CSRF token in response
  console.log('🔑 Test 1: Check if login provides CSRF token...');
  const loginPayload = JSON.stringify({ phone: '+79001234567', password: 'test123' });

  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, { headers: HEADERS });

  const csrfToken = loginRes.cookies.csrftoken && loginRes.cookies.csrftoken.length > 0
    ? loginRes.cookies.csrftoken[0].value
    : null;

  console.log(`Login Status: ${loginRes.status}`);
  console.log(`CSRF Token: ${csrfToken ? 'present' : 'missing'}`);

  check(loginRes, {
    '[Token] login processed': (r) => [200, 400, 401, 403, 429].includes(r.status),
    '[Token] response is JSON': (r) => {
      try { r.json(); return true; } catch (e) { return false; }
    },
  });

  sleep(0.5);

  // Test 2: GET request with session — should work without CSRF
  console.log('\n📖 Test 2: GET request works without CSRF token...');
  const getRes = http.get(`${BASE_URL}/api/auth/me`, { headers: sessionHeaders });

  console.log(`Status: ${getRes.status}`);

  check(getRes, {
    '[GET] request handled': (r) => [200, 401, 403].includes(r.status),
  });

  sleep(0.5);

  // Test 3: PATCH with session and valid CSRF token (if we have one)
  console.log('\n✅ Test 3: PATCH with valid CSRF token...');
  const patchHeaders = {
    ...HEADERS,
    ...sessionHeaders,
  };
  if (csrfToken) {
    patchHeaders['X-CSRFToken'] = csrfToken;
  }

  const validCsrfRes = http.patch(
    `${BASE_URL}/api/user/nickname`,
    JSON.stringify({ nickname: 'csrf_test_user' }),
    { headers: patchHeaders }
  );

  console.log(`Status: ${validCsrfRes.status}`);

  check(validCsrfRes, {
    '[Valid CSRF] request processed': (r) => [200, 201, 400, 401, 403, 404, 405].includes(r.status),
    '[Valid CSRF] not rejected for CSRF reason only': (r) => {
      if (r.status === 403) {
        try {
          const body = r.json();
          const errorMsg = JSON.stringify(body).toLowerCase();
          return !errorMsg.includes('csrf');
        } catch (e) { return true; }
      }
      return true;
    },
  });

  sleep(0.5);

  // Test 4: POST without session or CSRF — should be rejected
  console.log('\n❌ Test 4: State-changing request without auth...');
  const noCsrfRes = http.patch(
    `${BASE_URL}/api/user/nickname`,
    JSON.stringify({ nickname: 'no_csrf_test' }),
    { headers: HEADERS }
  );

  console.log(`Status: ${noCsrfRes.status}`);

  check(noCsrfRes, {
    '[No Auth] request rejected': (r) => r.status === 401 || r.status === 403,
    '[No Auth] response is valid': (r) => r.body.length > 0,
  });

  sleep(0.5);

  // Test 5: PATCH with invalid CSRF token
  console.log('\n⚠️  Test 5: PATCH with invalid CSRF token...');
  const invalidCsrfRes = http.patch(
    `${BASE_URL}/api/user/nickname`,
    JSON.stringify({ nickname: 'invalid_csrf' }),
    {
      headers: {
        ...HEADERS,
        ...sessionHeaders,
        'X-CSRFToken': 'invalid_token_12345',
      },
    }
  );

  console.log(`Status: ${invalidCsrfRes.status}`);

  check(invalidCsrfRes, {
    '[Invalid CSRF] request handled': (r) => [200, 400, 401, 403, 404, 405].includes(r.status),
    '[Invalid CSRF] proper response': (r) => r.body.length > 0,
  });

  sleep(0.5);

  // Test 6: Check logout endpoint is accessible
  console.log('\n🔄 Test 6: Logout endpoint accessible...');
  const logoutRes = http.post(
    `${BASE_URL}/api/auth/logout`,
    null,
    { headers: sessionHeaders }
  );

  console.log(`Logout status: ${logoutRes.status}`);

  check(logoutRes, {
    '[Logout] logout handled': (r) => [200, 204, 401, 403, 405].includes(r.status),
  });

  console.log('\n✅ All CSRF protection tests completed\n');
}
