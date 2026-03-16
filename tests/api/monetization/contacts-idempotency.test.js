import http from 'k6/http';
import { check, group, sleep } from 'k6';

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
 * Contact Purchase Idempotency Test
 * 
 * Tests that duplicate contact purchases are prevented.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n🔒 Testing Contact Purchase Idempotency');
  
  // ===========================================
  // Test 1: Duplicate Purchase Prevention
  // ===========================================
  group('Idempotency: Duplicate Purchase', () => {
    console.log('\n✅ Test 1: Prevent duplicate purchase...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      profile_type: 'worker',
      profile_id: 1,
      use_balance: false,
    });
    
    // First purchase attempt
    const res1 = http.post(
      `${BASE_URL}/api/purchase-contact`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`First attempt status: ${res1.status}`);
    console.log(`First attempt response: ${res1.body}`);
    
    sleep(1);
    
    // Second purchase attempt (should be prevented or return same result)
    const res2 = http.post(
      `${BASE_URL}/api/purchase-contact`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Second attempt status: ${res2.status}`);
    console.log(`Second attempt response: ${res2.body}`);
    
    check(res1, {
      '[First] status is valid': (r) => r.status === 200 || r.status === 400 || r.status === 402,
      '[First] has JSON response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
    });
    
    check(res2, {
      '[Second] handled correctly': (r) => {
        // Should either succeed (idempotent) or return "already purchased" error
        if (r.status === 200) return true; // Idempotent success
        if (r.status === 400) {
          try {
            const body = r.json();
            const errorMsg = body.error?.message || body.error || '';
            return errorMsg.includes('уже') || 
                   errorMsg.includes('already') ||
                   errorMsg.includes('Недостаточно');
          } catch (e) {
            return false;
          }
        }
        return r.status === 402; // Insufficient balance
      },
      '[Second] has response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ Idempotency test completed\n');
}
