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
 * Helper function to login with custom credentials
 */
function loginWith(phone, password) {
  const loginPayload = JSON.stringify({
    phone: phone,
    password: password,
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
 * Helper function to login and get session cookie
 */
function login() {
  return loginWith(TEST_PHONE, TEST_PASSWORD);
}

/**
 * User Password Change Test
 * 
 * Tests password change functionality (POST /api/user/change-password):
 * 1. Authenticated: Valid password change
 * 2. Authenticated: Wrong current password (401)
 * 3. Authenticated: New password too short (400)
 * 4. Unauthenticated: Must return 401
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n🔐 Testing User Password Change');
  
  // ===========================================
  // Test 1: Valid Password Change (Authenticated)
  // ===========================================
  group('Authenticated: Valid Password Change', () => {
    console.log('\n✅ Test 1: Valid password change...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const newPassword = 'newpass123';
    const payload = JSON.stringify({
      current_password: TEST_PASSWORD,
      new_password: newPassword,
    });
    
    const res = http.post(
      `${BASE_URL}/api/user/change-password`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Valid] status is 200': (r) => r.status === 200,
      '[Valid] has ok field': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('ok');
        } catch (e) {
          return false;
        }
      },
      '[Valid] ok is true': (r) => {
        try {
          const body = r.json();
          return body.ok === true;
        } catch (e) {
          return false;
        }
      },
      '[Valid] has message field': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('message');
        } catch (e) {
          return false;
        }
      },
    });
    
    // Change password back to original
    if (res.status === 200) {
      console.log('\\n🔄 Reverting password back to original...');
      
      // Login with new password to get valid session
      const newSessionId = loginWith(TEST_PHONE, newPassword);
      if (!newSessionId) {
        console.error('Failed to login with new password');
        return;
      }
      
      const revertPayload = JSON.stringify({
        current_password: newPassword,
        new_password: TEST_PASSWORD,
      });
      
      const revertRes = http.post(
        `${BASE_URL}/api/user/change-password`,
        revertPayload,
        { 
          headers,
          cookies: { sessionid: newSessionId },
        }
      );
      
      console.log(`Revert Status: ${revertRes.status}`);
      console.log(`Revert Response: ${revertRes.body}`);
      
      if (revertRes.status === 200) {
        console.log('✅ Password reverted successfully');
      } else {
        console.error('❌ Failed to revert password');
      }
    }
  });
  
  // ===========================================
  // Test 2: Wrong Current Password
  // ===========================================
  group('Authenticated: Wrong Current Password', () => {
    console.log('\n❌ Test 2: Wrong current password...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      current_password: 'wrongpassword',
      new_password: 'newpass123',
    });
    
    const res = http.post(
      `${BASE_URL}/api/user/change-password`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Wrong Current] status is 400': (r) => r.status === 400,
      '[Wrong Current] has error message': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('detail') || body.hasOwnProperty('error');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 3: New Password Too Short
  // ===========================================
  group('Authenticated: New Password Too Short', () => {
    console.log('\n⚠️  Test 3: New password too short...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      current_password: TEST_PASSWORD,
      new_password: 'short', // 5 characters, minimum is 6
    });
    
    const res = http.post(
      `${BASE_URL}/api/user/change-password`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Too Short] status is 400': (r) => r.status === 400,
      '[Too Short] has error message': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('detail') || body.hasOwnProperty('error');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 4: Unauthenticated Request
  // ===========================================
  group('Unauthenticated: Must Fail', () => {
    console.log('\n🔒 Test 4: Unauthenticated request...');
    
    const payload = JSON.stringify({
      current_password: TEST_PASSWORD,
      new_password: 'newpass123',
    });
    
    // Explicitly pass empty cookies to ensure no session is used
    const jar = http.cookieJar();
    jar.clear(BASE_URL);
    
    const res = http.post(
      `${BASE_URL}/api/user/change-password`,
      payload,
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
  
  console.log('\n✅ All password change tests completed');
}
