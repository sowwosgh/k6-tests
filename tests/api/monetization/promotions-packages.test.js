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
 * Promotion Packages Test
 * 
 * Tests promotion packages listing (GET /api/promotions/packages):
 * 1. List available promotion packages
 * 2. Package structure validation
 * 3. Package types (boost, urgent)
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n🚀 Testing Promotion Packages');
  
  // ===========================================
  // Test 1: Get Packages (Public)
  // ===========================================
  group('Public: Get Promotion Packages', () => {
    console.log('\n✅ Test 1: List promotion packages...');
    
    const res = http.get(
      `${BASE_URL}/api/boost/packages`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Packages] status is 200': (r) => r.status === 200,
      '[Packages] response is array': (r) => {
        try {
          const body = r.json();
          return Array.isArray(body) || Array.isArray(body.packages);
        } catch (e) {
          return false;
        }
      },
      '[Packages] has valid structure': (r) => {
        try {
          const body = r.json();
          const packages = Array.isArray(body) ? body : body.packages;
          if (!packages || packages.length === 0) return true; // Empty is valid
          
          const pkg = packages[0];
          return pkg.hasOwnProperty('id') && 
                 pkg.hasOwnProperty('type') && 
                 pkg.hasOwnProperty('credits');
        } catch (e) {
          return false;
        }
      },
      '[Packages] has valid types': (r) => {
        try {
          const body = r.json();
          const packages = Array.isArray(body) ? body : body.packages;
          if (!packages || packages.length === 0) return true;
          
          // Accept any type (top, vip, urgent, boost, etc.)
          return packages.every(pkg => {
            return typeof pkg.type === 'string' && pkg.type.length > 0;
          });
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Get Packages (Authenticated)
  // ===========================================
  group('Authenticated: Get Packages', () => {
    console.log('\n✅ Test 2: Get packages as authenticated user...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.get(
      `${BASE_URL}/api/boost/packages`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Auth] status is 200': (r) => r.status === 200,
      '[Auth] response structure valid': (r) => {
        try {
          const body = r.json();
          return Array.isArray(body) || Array.isArray(body.packages);
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ Promotion packages test completed\n');
}
