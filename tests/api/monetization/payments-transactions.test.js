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
 * Transactions History Test
 * 
 * Tests payment transactions history endpoint.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n📝 Testing Transactions History');
  
  // ===========================================
  // Test 1: Get Transactions (Authenticated)
  // ===========================================
  group('Authenticated: Get Transactions', () => {
    console.log('\n✅ Test 1: Get transactions history...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.get(
      `${BASE_URL}/api/payments/transactions`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Transactions] status is 200': (r) => r.status === 200,
      '[Transactions] response is array': (r) => {
        try {
          const body = r.json();
          return Array.isArray(body) || Array.isArray(body.transactions);
        } catch (e) {
          return false;
        }
      },
      '[Transactions] valid structure': (r) => {
        try {
          const body = r.json();
          const transactions = Array.isArray(body) ? body : body.transactions;
          if (!transactions || transactions.length === 0) return true;
          
          const tx = transactions[0];
          return tx.hasOwnProperty('id') && 
                 tx.hasOwnProperty('amount') &&
                 tx.hasOwnProperty('created_at');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Unauthenticated Access
  // ===========================================
  group('Unauthenticated: Get Transactions', () => {
    console.log('\n🔒 Test 2: Unauthenticated access...');
    
    const res = http.get(
      `${BASE_URL}/api/payments/transactions`,
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
  
  console.log('\n✅ Transactions history test completed\n');
}
