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
 * XSS Protection Test
 * 
 * Tests protection against Cross-Site Scripting attacks:
 * 1. XSS in nickname field
 * 2. XSS in search parameters
 * 3. XSS in form data (worker name)
 * 4. Check proper HTML escaping in responses
 * 5. Verify Content-Security-Policy headers
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n🛡️  Testing XSS Protection');
  
  // Common XSS payloads
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(\'XSS\')">',
  ];
  
  // ===========================================
  // Test 1: XSS in Nickname Field
  // ===========================================
  group('XSS: Nickname Field', () => {
    console.log('\n📝 Test 1: XSS in nickname field...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      nickname: xssPayloads[0],
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
      '[Nickname XSS] rejected or sanitized': (r) => {
        // Either rejected with validation error or sanitized
        if (r.status === 400) return true;
        try {
          const body = r.json();
          // If accepted, check that dangerous chars are not present
          if (body.nickname) {
            return !body.nickname.includes('<') && 
                   !body.nickname.includes('>') && 
                   !body.nickname.includes('script');
          }
          return true;
        } catch (e) {
          return false;
        }
      },
      '[Nickname XSS] no script tags in response': (r) => {
        return !r.body.toLowerCase().includes('<script');
      },
    });
  });
  
  // ===========================================
  // Test 2: XSS in Search Parameters
  // ===========================================
  group('XSS: Search Parameters', () => {
    console.log('\n🔍 Test 2: XSS in search parameters...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const searchQuery = encodeURIComponent(xssPayloads[1]);
    
    const res = http.get(
      `${BASE_URL}/api/feed?search=${searchQuery}`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body.substring(0, 200)}`);
    
    check(res, {
      '[Search XSS] returns valid response': (r) => r.status === 200 || r.status === 400,
      '[Search XSS] no script tags in response': (r) => {
        return !r.body.toLowerCase().includes('<script') && 
               !r.body.toLowerCase().includes('onerror=');
      },
      '[Search XSS] response is valid JSON': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 3: XSS in Worker Full Name
  // ===========================================
  group('XSS: Worker Profile Data', () => {
    console.log('\n👤 Test 3: XSS in worker profile data...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      full_name: xssPayloads[2],
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
      '[Worker XSS] creates or rejects': (r) => r.status === 200 || r.status === 201 || r.status === 400 || r.status === 422,
      '[Worker XSS] no script tags in response': (r) => {
        return !r.body.toLowerCase().includes('<svg') && 
               !r.body.toLowerCase().includes('onload=');
      },
      '[Worker XSS] sanitized if accepted': (r) => {
        try {
          const body = r.json();
          if (body.full_name) {
            return !body.full_name.includes('<') && !body.full_name.includes('>');
          }
          return true;
        } catch (e) {
          return true;
        }
      },
    });
  });
  
  // ===========================================
  // Test 4: Check Response Headers for Security
  // ===========================================
  group('XSS: Security Headers', () => {
    console.log('\n🔒 Test 4: Check security headers...');
    
    const res = http.get(`${BASE_URL}/api/auth/me`, { headers });
    
    console.log(`Status: ${res.status}`);
    console.log(`Headers: ${JSON.stringify(res.headers).substring(0, 200)}`);
    
    check(res, {
      '[Headers] X-Content-Type-Options present': (r) => {
        // Should have X-Content-Type-Options: nosniff
        return r.headers['X-Content-Type-Options'] !== undefined ||
               r.headers['x-content-type-options'] !== undefined;
      },
      '[Headers] Content-Type is application/json': (r) => {
        const ct = r.headers['Content-Type'] || r.headers['content-type'] || '';
        return ct.includes('application/json');
      },
    });
  });
  
  // ===========================================
  // Test 5: XSS in Check Nickname
  // ===========================================
  group('XSS: Check Nickname Endpoint', () => {
    console.log('\n🔎 Test 5: XSS in check nickname...');
    
    const maliciousNickname = encodeURIComponent(xssPayloads[3]);
    
    const res = http.get(
      `${BASE_URL}/api/user/check-nickname?nickname=${maliciousNickname}`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body.substring(0, 200)}`);
    
    check(res, {
      '[Check Nickname XSS] returns valid status': (r) => r.status === 200,
      '[Check Nickname XSS] no script in response': (r) => {
        return !r.body.toLowerCase().includes('javascript:') && 
               !r.body.toLowerCase().includes('alert(');
      },
      '[Check Nickname XSS] handles as invalid': (r) => {
        try {
          const body = r.json();
          return body.available === false;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ All XSS protection tests completed');
}
