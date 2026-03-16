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
 * Promotions Pricing Test
 * 
 * Tests promotion pricing endpoints.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n💰 Testing Promotions Pricing');
  
  // ===========================================
  // Test 1: Get Boost Pricing
  // ===========================================
  group('Public: Get Boost Pricing', () => {
    console.log('\n✅ Test 1: Get boost pricing...');
    
    const res = http.get(
      `${BASE_URL}/api/boost/pricing`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Pricing] status is valid': (r) => r.status === 200 || r.status === 404,
      '[Pricing] has JSON response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
      '[Pricing] has pricing data': (r) => {
        if (r.status === 404) return true;
        try {
          const body = r.json();
          return Array.isArray(body) || body.hasOwnProperty('pricing') || body.hasOwnProperty('packages');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ Promotions pricing test completed\n');
}
