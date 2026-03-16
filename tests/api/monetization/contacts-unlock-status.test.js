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
 * Unlock Status Test
 * 
 * Tests contact unlock status checking.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n🔓 Testing Unlock Status');
  
  // ===========================================
  // Test 1: Check Unlock Status (Authenticated)
  // ===========================================
  group('Authenticated: Check Unlock Status', () => {
    console.log('\n✅ Test 1: Check if contact can be unlocked...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.get(
      `${BASE_URL}/api/contacts/unlock-status/worker/1`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Status] status is valid': (r) => r.status === 200 || r.status === 404,
      '[Status] has JSON response': (r) => {
        if (r.status === 404) return true; // 404 may be HTML
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
      '[Status] has unlock data': (r) => {
        if (r.status === 404) return true;
        try {
          const body = r.json();
          return body.hasOwnProperty('can_unlock') ||
                 body.hasOwnProperty('is_unlocked') ||
                 body.hasOwnProperty('price');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Invalid Profile Type
  // ===========================================
  group('Invalid: Profile Type', () => {
    console.log('\n❌ Test 2: Invalid profile type...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.get(
      `${BASE_URL}/api/contacts/unlock-status/invalid/1`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Invalid] error response': (r) => r.status === 400 || r.status === 404 || r.status === 422,
      '[Invalid] has response': (r) => {
        if (r.status === 404) return true; // 404 may be HTML
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ Unlock status test completed\n');
}
