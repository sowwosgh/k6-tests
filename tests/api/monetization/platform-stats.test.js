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
 * Platform Stats Test
 * 
 * Tests platform statistics endpoint (GET /api/stats):
 * 1. Get platform statistics
 * 2. Stats structure validation
 * 3. Public access (no auth required)
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n📊 Testing Platform Stats');
  
  // ===========================================
  // Test 1: Get Platform Stats (Public)
  // ===========================================
  group('Public: Get Platform Stats', () => {
    console.log('\n✅ Test 1: Get platform statistics...');
    
    const res = http.get(
      `${BASE_URL}/api/stats`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Stats] status is 200': (r) => r.status === 200,
      '[Stats] response is valid': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
      '[Stats] has specialists field': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('specialists');
        } catch (e) {
          return false;
        }
      },
      '[Stats] has active_jobs field': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('active_jobs');
        } catch (e) {
          return false;
        }
      },
      '[Stats] has completed_projects field': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('completed_projects');
        } catch (e) {
          return false;
        }
      },
      '[Stats] all values are numbers': (r) => {
        try {
          const body = r.json();
          return typeof body.specialists === 'number' &&
                 typeof body.active_jobs === 'number' &&
                 typeof body.completed_projects === 'number';
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ Platform stats test completed\n');
}
