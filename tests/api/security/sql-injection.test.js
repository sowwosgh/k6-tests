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
 * SQL Injection Security Test
 * 
 * Tests protection against SQL injection attacks:
 * 1. Login with SQL injection payloads
 * 2. Search with SQL injection in query parameters
 * 3. ID parameters with SQL injection
 * 4. Nickname field with SQL injection
 * 5. Verify proper error handling without exposing DB details
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n🛡️  Testing SQL Injection Protection');
  
  // Common SQL injection payloads
  const sqlPayloads = [
    "' OR '1'='1",
    "' OR 1=1--",
    "' UNION SELECT NULL--",
    "admin'--",
    "1' AND '1'='1",
  ];
  
  // ===========================================
  // Test 1: SQL Injection in Login
  // ===========================================
  group('SQL Injection: Login', () => {
    console.log('\n🔒 Test 1: SQL injection in login...');
    
    const payload = JSON.stringify({
      phone: sqlPayloads[0],
      password: sqlPayloads[1],
    });
    
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      payload,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body.substring(0, 200)}`);
    
    check(res, {
      '[Login SQLi] request rejected (not 200)': (r) => r.status !== 200,
      '[Login SQLi] no SQL error exposed': (r) => {
        const body = r.body.toLowerCase();
        return !body.includes('sql') && 
               !body.includes('syntax error') && 
               !body.includes('mysql') &&
               !body.includes('postgresql') &&
               !body.includes('sqlite');
      },
      '[Login SQLi] proper error response': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('ok') || body.hasOwnProperty('detail') || body.hasOwnProperty('error');
        } catch (e) {
          return true; // Non-JSON response is also acceptable
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: SQL Injection in Search Query
  // ===========================================
  group('SQL Injection: Search', () => {
    console.log('\n🔍 Test 2: SQL injection in search...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const searchQuery = encodeURIComponent(sqlPayloads[2]);
    
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
      '[Search SQLi] returns valid status': (r) => r.status === 200 || r.status === 400 || r.status === 422,
      '[Search SQLi] no SQL error exposed': (r) => {
        const body = r.body.toLowerCase();
        return !body.includes('sql syntax') && 
               !body.includes('mysql error') &&
               !body.includes('postgres error') &&
               !body.includes('database error');
      },
      '[Search SQLi] response is valid JSON or empty': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return r.body === '';
        }
      },
    });
  });
  
  // ===========================================
  // Test 3: SQL Injection in ID Parameter
  // ===========================================
  group('SQL Injection: ID Parameter', () => {
    console.log('\n🆔 Test 3: SQL injection in ID parameter...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const maliciousId = "1' OR '1'='1";
    
    const res = http.get(
      `${BASE_URL}/api/worker/${maliciousId}`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body.substring(0, 200)}`);
    
    check(res, {
      '[ID SQLi] returns error status': (r) => r.status === 400 || r.status === 404 || r.status === 422,
      '[ID SQLi] no SQL error exposed': (r) => {
        const body = r.body.toLowerCase();
        return !body.includes('sql') && 
               !body.includes('syntax') &&
               !body.includes('mysql') &&
               !body.includes('postgres');
      },
      '[ID SQLi] does not return unauthorized data': (r) => {
        // Should not return valid worker data
        try {
          const body = r.json();
          return !body.hasOwnProperty('full_name') || body.full_name === null;
        } catch (e) {
          return true;
        }
      },
    });
  });
  
  // ===========================================
  // Test 4: SQL Injection in Nickname Field
  // ===========================================
  group('SQL Injection: Nickname Update', () => {
    console.log('\n📝 Test 4: SQL injection in nickname update...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      nickname: sqlPayloads[3],
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
      '[Nickname SQLi] handles safely': (r) => r.status === 200 || r.status === 400,
      '[Nickname SQLi] no SQL error exposed': (r) => {
        const body = r.body.toLowerCase();
        return !body.includes('sql') && 
               !body.includes('database') &&
               !body.includes('query');
      },
      '[Nickname SQLi] proper validation': (r) => {
        try {
          const body = r.json();
          // Either rejected with validation error or sanitized and accepted
          if (r.status === 400) {
            return body.hasOwnProperty('error') || body.hasOwnProperty('detail');
          }
          return true;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 5: SQL Injection in Check Nickname
  // ===========================================
  group('SQL Injection: Check Nickname', () => {
    console.log('\n🔎 Test 5: SQL injection in check nickname...');
    
    const maliciousNickname = encodeURIComponent("test' OR '1'='1");
    
    const res = http.get(
      `${BASE_URL}/api/user/check-nickname?nickname=${maliciousNickname}`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body.substring(0, 200)}`);
    
    check(res, {
      '[Check Nickname SQLi] returns valid status': (r) => r.status === 200,
      '[Check Nickname SQLi] no SQL error exposed': (r) => {
        const body = r.body.toLowerCase();
        return !body.includes('sql') && 
               !body.includes('syntax error') &&
               !body.includes('database');
      },
      '[Check Nickname SQLi] returns proper response': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('available') && body.hasOwnProperty('error');
        } catch (e) {
          return false;
        }
      },
      '[Check Nickname SQLi] handles as invalid': (r) => {
        try {
          const body = r.json();
          // Should treat SQL injection as invalid nickname
          return body.available === false;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ All SQL injection protection tests completed');
}
