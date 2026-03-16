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
 * Credit Packages Test
 * 
 * Tests credit packages listing (GET /api/payments/packages):
 * 1. Get available credit packages
 * 2. Package structure validation
 * 3. Pricing information
 * 4. Package ordering
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n💰 Testing Credit Packages');
  
  // ===========================================
  // Test 1: Get Packages (Public access)
  // ===========================================
  group('Public: Get Credit Packages', () => {
    console.log('\n✅ Test 1: Get available packages...');
    
    const res = http.get(
      `${BASE_URL}/api/payments/packages`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Packages] status is 200': (r) => r.status === 200,
      '[Packages] response is array': (r) => {
        try {
          const body = r.json();
          return Array.isArray(body);
        } catch (e) {
          return false;
        }
      },
      '[Packages] has packages': (r) => {
        try {
          const body = r.json();
          return body.length > 0;
        } catch (e) {
          return false;
        }
      },
      '[Packages] package has id': (r) => {
        try {
          const body = r.json();
          return body.length > 0 && body[0].hasOwnProperty('id');
        } catch (e) {
          return false;
        }
      },
      '[Packages] package has price': (r) => {
        try {
          const body = r.json();
          return body.length > 0 && body[0].hasOwnProperty('price');
        } catch (e) {
          return false;
        }
      },
      '[Packages] package has credits': (r) => {
        try {
          const body = r.json();
          return body.length > 0 && body[0].hasOwnProperty('credits');
        } catch (e) {
          return false;
        }
      },
      '[Packages] price is valid number': (r) => {
        try {
          const body = r.json();
          return body.length > 0 && typeof body[0].price === 'number' && body[0].price > 0;
        } catch (e) {
          return false;
        }
      },
      '[Packages] credits is valid': (r) => {
        try {
          const body = r.json();
          return body.length > 0 && typeof body[0].credits === 'number' && body[0].credits > 0;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ Credit packages test completed\n');
}
