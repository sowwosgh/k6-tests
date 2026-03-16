import http from 'k6/http';
import { check, group } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.90'],
    http_req_duration: ['p(95)<2000'],
  },
};

/**
 * Monetization Packages Overview Test
 * 
 * Tests all monetization packages endpoints in one test.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n📦 Testing Monetization Packages Overview');
  
  // ===========================================
  // Test 1: Credits Packages
  // ===========================================
  group('Overview: Credits Packages', () => {
    console.log('\n✅ Test 1: Get credits packages...');
    
    const res = http.get(
      `${BASE_URL}/api/payments/packages`,
      { headers }
    );
    
    console.log(`Credits packages status: ${res.status}`);
    
    check(res, {
      '[Credits] status is 200': (r) => r.status === 200,
      '[Credits] has packages': (r) => {
        try {
          const body = r.json();
          return Array.isArray(body) && body.length > 0;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Boost Packages
  // ===========================================
  group('Overview: Boost Packages', () => {
    console.log('\n✅ Test 2: Get boost packages...');
    
    const res = http.get(
      `${BASE_URL}/api/boost/packages`,
      { headers }
    );
    
    console.log(`Boost packages status: ${res.status}`);
    
    check(res, {
      '[Boost] status is 200': (r) => r.status === 200,
      '[Boost] has packages': (r) => {
        try {
          const body = r.json();
          return Array.isArray(body) && body.length > 0;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 3: Subscription Plans
  // ===========================================
  group('Overview: Subscription Plans', () => {
    console.log('\n✅ Test 3: Get subscription plans...');
    
    const res = http.get(
      `${BASE_URL}/api/subscriptions/plans`,
      { headers }
    );
    
    console.log(`Subscription plans status: ${res.status}`);
    
    check(res, {
      '[Subscriptions] status is 200': (r) => r.status === 200,
      '[Subscriptions] has plans': (r) => {
        try {
          const body = r.json();
          return Array.isArray(body) && body.length > 0;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ Packages overview test completed\n');
}
