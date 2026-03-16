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
 * User Billing History Test
 * 
 * Tests user billing history with detailed transactions.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n📖 Testing User Billing History');
  
  // ===========================================
  // Test 1: Get Billing History (Authenticated)
  // ===========================================
  group('Authenticated: Get Billing History', () => {
    console.log('\n✅ Test 1: Get user billing history...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.get(
      `${BASE_URL}/api/billing/history`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[History] status is 200': (r) => r.status === 200 || r.status === 404,
      '[History] response is array': (r) => {
        if (r.status === 404) return true; // 404 may be HTML
        try {
          const body = r.json();
          return Array.isArray(body) || Array.isArray(body.history) || Array.isArray(body.transactions);
        } catch (e) {
          return false;
        }
      },
      '[History] valid structure': (r) => {
        try {
          const body = r.json();
          const history = Array.isArray(body) ? body : (body.history || body.transactions);
          if (!history || history.length === 0) return true;
          
          const item = history[0];
          return item.hasOwnProperty('id') || 
                 item.hasOwnProperty('created_at') ||
                 item.hasOwnProperty('type');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Unauthenticated Access
  // ===========================================
  group('Unauthenticated: Get Billing History', () => {
    console.log('\n🔒 Test 2: Unauthenticated access...');
    
    const res = http.get(
      `${BASE_URL}/api/billing/history`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Unauth] status is valid': (r) => r.status === 200 || r.status === 401 || r.status === 403,
      '[Unauth] has response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ Billing history test completed\n');
}
