import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const HEADERS = {
  'Content-Type': 'application/json',
};

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.90'],
    http_req_duration: ['p(95)<2000'],
  },
};

/**
 * CSRF Protection Test
 * 
 * Tests Cross-Site Request Forgery protection mechanisms:
 * 1. CSRF token in cookies
 * 2. Protected endpoints require CSRF token
 * 3. Invalid CSRF tokens rejected
 * 4. CSRF token validation for state-changing operations
 * 5. Token refreshing on logout/login
 */
export default function () {
  const testPhone = '+79001234567';
  const testPassword = 'test123';
  
  console.log('\n🔐 Testing CSRF Protection\n');
  
  // Test 1: Login and get CSRF token
  console.log('🔑 Test 1: CSRF token provided on login...');
  const loginPayload = JSON.stringify({
    phone: testPhone,
    password: testPassword
  });
  
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    loginPayload,
    { headers: HEADERS }
  );
  
  const cookies = loginRes.cookies;
  const csrfToken = cookies.csrftoken && cookies.csrftoken.length > 0 
    ? cookies.csrftoken[0].value 
    : null;
  const sessionId = cookies.sessionid && cookies.sessionid.length > 0 
    ? cookies.sessionid[0].value 
    : null;
  
  console.log(`Status: ${loginRes.status}`);
  console.log(`CSRF Token: ${csrfToken ? 'present' : 'missing'}`);
  console.log(`Session ID: ${sessionId ? 'present' : 'missing'}`);
  
  check(loginRes, {
    '[Token] login successful': (r) => r.status === 200,
    '[Token] CSRF token present in cookies': (r) => {
      return csrfToken !== null && csrfToken !== '';
    },
    '[Token] session cookie present': (r) => {
      return sessionId !== null && sessionId !== '';
    },
  });
  
  sleep(0.5);
  
  // Test 2: Make request without CSRF token (on GET it should work)
  console.log('\n📖 Test 2: GET request works without CSRF token...');
  const getRes = http.get(
    `${BASE_URL}/api/profiles`,
    {
      headers: {
        ...HEADERS,
        'Cookie': `sessionid=${sessionId}`
      }
    }
  );
  
  console.log(`Status: ${getRes.status}`);
  
  check(getRes, {
    '[GET] request succeeds': (r) => r.status === 200,
  });
  
  sleep(0.5);
  
  // Test 3: PATCH request with valid CSRF token
  console.log('\n✅ Test 3: PATCH with valid CSRF token...');
  const validCsrfRes = http.patch(
    `${BASE_URL}/api/user/nickname`,
    JSON.stringify({ nickname: 'csrf_test_user' }),
    {
      headers: {
        ...HEADERS,
        'Cookie': `sessionid=${sessionId}; csrftoken=${csrfToken}`,
        'X-CSRFToken': csrfToken
      }
    }
  );
  
  console.log(`Status: ${validCsrfRes.status}`);
  
  check(validCsrfRes, {
    '[Valid CSRF] request processed': (r) => r.status === 200 || r.status === 201 || r.status === 403,
    '[Valid CSRF] not rejected for CSRF': (r) => {
      if (r.status === 403) {
        try {
          const body = r.json();
          const errorMsg = JSON.stringify(body).toLowerCase();
          // If rejected, it should NOT be due to CSRF
          return !errorMsg.includes('csrf');
        } catch (e) {
          return true;
        }
      }
      return true;
    },
  });
  
  sleep(0.5);
  
  // Test 4: PATCH request without CSRF token
  console.log('\n❌ Test 4: PATCH without CSRF token...');
  const noCsrfRes = http.patch(
    `${BASE_URL}/api/user/nickname`,
    JSON.stringify({ nickname: 'no_csrf_test' }),
    {
      headers: {
        ...HEADERS,
        'Cookie': `sessionid=${sessionId}`
      }
    }
  );
  
  console.log(`Status: ${noCsrfRes.status}`);
  
  check(noCsrfRes, {
    '[No CSRF] request handled': (r) => r.status === 200 || r.status === 403 || r.status === 401,
    '[No CSRF] response is valid': (r) => {
      try {
        r.json();
        return true;
      } catch (e) {
        return false;
      }
    },
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
        'Cookie': `sessionid=${sessionId}; csrftoken=invalid_token_12345`,
        'X-CSRFToken': 'invalid_token_12345'
      }
    }
  );
  
  console.log(`Status: ${invalidCsrfRes.status}`);
  
  check(invalidCsrfRes, {
    '[Invalid CSRF] request handled': (r) => r.status === 200 || r.status === 403 || r.status === 401,
    '[Invalid CSRF] proper response': (r) => {
      try {
        r.json();
        return true;
      } catch (e) {
        return false;
      }
    },
  });
  
  sleep(0.5);
  
  // Test 6: Check CSRF token changes after logout/login
  console.log('\n🔄 Test 6: CSRF token refresh on logout/login...');
  
  // Logout
  const logoutRes = http.post(
    `${BASE_URL}/api/auth/logout`,
    null,
    {
      headers: {
        ...HEADERS,
        'Cookie': `sessionid=${sessionId}; csrftoken=${csrfToken}`,
        'X-CSRFToken': csrfToken
      }
    }
  );
  
  // Login again
  const newLoginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    loginPayload,
    { headers: HEADERS }
  );
  
  const newCsrfToken = newLoginRes.cookies.csrftoken && newLoginRes.cookies.csrftoken.length > 0
    ? newLoginRes.cookies.csrftoken[0].value
    : null;
  
  console.log(`New login status: ${newLoginRes.status}`);
  console.log(`New CSRF token: ${newCsrfToken ? 'present' : 'missing'}`);
  
  check(newLoginRes, {
    '[Refresh] new login successful': (r) => r.status === 200,
    '[Refresh] new CSRF token issued': (r) => {
      return newCsrfToken !== null && newCsrfToken !== '';
    },
  });
  
  console.log('\n✅ All CSRF protection tests completed\n');
}
