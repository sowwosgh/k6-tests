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
 * Subscriptions Plans Test
 * 
 * Tests subscription plans listing (GET /api/subscriptions/plans):
 * 1. List available subscription plans
 * 2. Plan structure validation
 * 3. Plan features and pricing
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n💎 Testing Subscriptions Plans');
  
  // ===========================================
  // Test 1: Get Plans (Public)
  // ===========================================
  group('Public: Get Subscription Plans', () => {
    console.log('\n✅ Test 1: List subscription plans...');
    
    const res = http.get(
      `${BASE_URL}/api/subscriptions/plans`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Plans] status is 200': (r) => r.status === 200,
      '[Plans] response is array': (r) => {
        try {
          const body = r.json();
          return Array.isArray(body) || Array.isArray(body.plans);
        } catch (e) {
          return false;
        }
      },
      '[Plans] has valid structure': (r) => {
        try {
          const body = r.json();
          const plans = Array.isArray(body) ? body : body.plans;
          if (!plans || plans.length === 0) return true; // Empty is valid
          
          const plan = plans[0];
          return plan.hasOwnProperty('id') && 
                 plan.hasOwnProperty('name') && 
                 plan.hasOwnProperty('price');
        } catch (e) {
          return false;
        }
      },
      '[Plans] has features': (r) => {
        try {
          const body = r.json();
          const plans = Array.isArray(body) ? body : body.plans;
          if (!plans || plans.length === 0) return true;
          
          const plan = plans[0];
          return plan.hasOwnProperty('features') || 
                 plan.hasOwnProperty('contacts_per_month') ||
                 plan.hasOwnProperty('description');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Get Plans (Authenticated)
  // ===========================================
  group('Authenticated: Get Plans', () => {
    console.log('\n✅ Test 2: Get plans as authenticated user...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.get(
      `${BASE_URL}/api/subscriptions/plans`,
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
          return Array.isArray(body) || Array.isArray(body.plans);
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ Subscriptions plans test completed\n');
}
