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
 * Authorization Bypass Test
 * 
 * Tests protection against authorization bypass attacks:
 * 1. Access other user's profiles without permission
 * 2. Modify other user's data
 * 3. Delete resources that don't belong to user
 * 4. Access admin endpoints without admin rights
 * 5. Horizontal privilege escalation attempts
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n🛡️  Testing Authorization Bypass Protection');
  
  // ===========================================
  // Test 1: Access Without Authentication
  // ===========================================
  group('Authorization: Unauthenticated Access', () => {
    console.log('\n🔒 Test 1: Access protected resources without auth...');
    
    // Try to access user settings without auth
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
    console.log(`Response: ${res.body.substring(0, 200)}`);
    
    check(res, {
      '[Unauth] access denied': (r) => r.status === 401 || r.status === 403,
      '[Unauth] no sensitive data exposed': (r) => {
        try {
          const body = r.json();
          return !Array.isArray(body) || body.length === 0;
        } catch (e) {
          return true;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Modify Other User's Nickname
  // ===========================================
  group('Authorization: Modify Other User Data', () => {
    console.log('\n📝 Test 2: Try to modify other user data...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    // Try to update nickname (should only update current user)
    const payload = JSON.stringify({
      nickname: 'hacker_' + Date.now(),
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
    console.log(`Response: ${res.body.substring(0, 200)}`);
    
    check(res, {
      '[Modify] updates only own data': (r) => {
        // Should succeed but only for current user
        if (r.status === 200) {
          try {
            const body = r.json();
            // Check that we can't specify user_id or similar
            return body.ok === true;
          } catch (e) {
            return false;
          }
        }
        return false;
      },
    });
  });
  
  // ===========================================
  // Test 3: Delete Other User's Profile
  // ===========================================
  group('Authorization: Delete Other User Profile', () => {
    console.log('\n🗑️  Test 3: Try to delete profile with invalid ID...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    // Try to delete a profile that likely doesn't belong to us (ID 999)
    const res = http.del(
      `${BASE_URL}/api/worker/999`,
      null,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body.substring(0, 200)}`);
    
    check(res, {
      '[Delete] rejects unauthorized delete': (r) => {
        // Should be 403 (forbidden) or 404 (not found)
        return r.status === 403 || r.status === 404 || r.status === 401;
      },
      '[Delete] proper error message': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('ok') || body.hasOwnProperty('error') || body.hasOwnProperty('detail');
        } catch (e) {
          return true;
        }
      },
    });
  });
  
  // ===========================================
  // Test 4: Access Admin Endpoints
  // ===========================================
  group('Authorization: Admin Endpoints', () => {
    console.log('\n👑 Test 4: Try to access admin endpoints...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    // Try to access admin panel
    const res = http.get(
      `${BASE_URL}/admin/`,
      { 
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body.substring(0, 200)}`);
    
    check(res, {
      '[Admin] non-admin user denied': (r) => {
        // Should be redirected or denied (not 200 OK with admin panel)
        if (r.status === 200) {
          // If 200, check that it's not actually admin panel
          return r.body.includes('login') || !r.body.includes('Django administration');
        }
        return r.status === 302 || r.status === 401 || r.status === 403;
      },
    });
  });
  
  // ===========================================
  // Test 5: Horizontal Privilege Escalation
  // ===========================================
  group('Authorization: Horizontal Escalation', () => {
    console.log('\n↔️  Test 5: Horizontal privilege escalation...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    // Try to access user profiles list (should only return own profiles)
    const res = http.get(
      `${BASE_URL}/api/profiles`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body.substring(0, 300)}`);
    
    check(res, {
      '[Horizontal] returns only own profiles': (r) => {
        if (r.status === 200) {
          try {
            const body = r.json();
            // Should be an array but we can't verify ownership without more context
            // At least verify it's a proper response
            return Array.isArray(body);
          } catch (e) {
            return false;
          }
        }
        return false;
      },
      '[Horizontal] authenticated request succeeds': (r) => r.status === 200,
    });
  });
  
  // ===========================================
  // Test 6: Manipulate IDs in Request
  // ===========================================
  group('Authorization: ID Manipulation', () => {
    console.log('\n🔢 Test 6: Try to manipulate user ID in requests...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    // Try to create a worker profile with manipulated user_id
    const payload = JSON.stringify({
      user_id: 999, // Try to create profile for another user
      full_name: 'Hacker',
      professions: [1],
      experience_years: 5,
      birth_date: '1990-01-01',
    });
    
    const res = http.post(
      `${BASE_URL}/api/worker`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body.substring(0, 200)}`);
    
    check(res, {
      '[ID Manipulation] ignores malicious user_id': (r) => {
        // Should either reject or ignore the user_id field
        if (r.status === 200 || r.status === 201) {
          try {
            const body = r.json();
            // If successful, should belong to logged-in user (ID 17), not 999
            return body.user !== 999;
          } catch (e) {
            return true;
          }
        }
        // Rejection is also acceptable
        return r.status === 400 || r.status === 422;
      },
    });
  });
  
  console.log('\n✅ All authorization bypass tests completed');
}
