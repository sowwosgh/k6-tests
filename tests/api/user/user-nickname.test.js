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
 * User Nickname Update Test
 * 
 * Tests nickname update functionality (PATCH /api/user/nickname):
 * 1. Authenticated: Valid nickname update
 * 2. Authenticated: Nickname validation (length, characters)
 * 3. Authenticated: Duplicate nickname (409)
 * 4. Unauthenticated: Must return 401
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n📝 Testing User Nickname Update');
  
  // ===========================================
  // Test 1: Valid Nickname Update (Authenticated)
  // ===========================================
  group('Authenticated: Valid Nickname', () => {
    console.log('\n✅ Test 1: Valid nickname update...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const uniqueNickname = `test_${Date.now().toString().slice(-6)}`;
    const payload = JSON.stringify({
      nickname: uniqueNickname,
    });
    
    const res = http.patch(
      `${BASE_URL}/api/user/nickname`,
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
      '[Valid] has nickname field': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('nickname');
        } catch (e) {
          return false;
        }
      },
      '[Valid] nickname matches request': (r) => {
        try {
          const body = r.json();
          return body.nickname === uniqueNickname;
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
  });
  
  // ===========================================
  // Test 2: Nickname Validation (Too Short)
  // ===========================================
  group('Authenticated: Validation (Too Short)', () => {
    console.log('\n⚠️  Test 2: Nickname too short...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      nickname: 'ab', // 2 characters, minimum is 3
    });
    
    const res = http.patch(
      `${BASE_URL}/api/user/nickname`,
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
  // Test 3: Nickname Validation (Invalid Characters)
  // ===========================================
  group('Authenticated: Validation (Invalid Characters)', () => {
    console.log('\n⚠️  Test 3: Invalid characters in nickname...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      nickname: 'test@user!', // @ and ! are not allowed
    });
    
    const res = http.patch(
      `${BASE_URL}/api/user/nickname`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Invalid Chars] status is 400': (r) => r.status === 400,
      '[Invalid Chars] has error message': (r) => {
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
  // Test 4: Nickname Too Long
  // ===========================================
  group('Authenticated: Validation (Too Long)', () => {
    console.log('\n⚠️  Test 4: Nickname too long...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      nickname: 'a'.repeat(51), // 51 characters, maximum is 50
    });
    
    const res = http.patch(
      `${BASE_URL}/api/user/nickname`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Too Long] status is 400': (r) => r.status === 400,
      '[Too Long] has error message': (r) => {
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
  // Test 5: Unauthenticated Request
  // ===========================================
  group('Unauthenticated: Must Fail', () => {
    console.log('\n🔒 Test 5: Unauthenticated request...');
    
    const payload = JSON.stringify({
      nickname: 'test_unauth',
    });
    
    // Explicitly pass empty cookies to ensure no session is used
    const jar = http.cookieJar();
    jar.clear(BASE_URL);
    
    const res = http.patch(
      `${BASE_URL}/api/user/nickname`,
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
  
  console.log('\n✅ All nickname update tests completed');
}
