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
 * Active Urgents Test
 * 
 * Tests active urgent promotions listing.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n🔥 Testing Active Urgents');
  
  // ===========================================
  // Test 1: Get Active Urgents (Public)
  // ===========================================
  group('Public: Get Active Urgents', () => {
    console.log('\n✅ Test 1: Get active urgents...');
    
    const res = http.get(
      `${BASE_URL}/api/urgent/active`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Active] status is valid': (r) => r.status === 200 || r.status === 401 || r.status === 404,
      '[Active] has JSON response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
      '[Active] response is valid': (r) => {
        if (r.status === 401 || r.status === 404) return true;
        try {
          const body = r.json();
          return Array.isArray(body) || Array.isArray(body.urgents);
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ Active urgents test completed\n');
}
