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
 * Payment Status Test
 * 
 * Tests payment status checking endpoint.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n🔍 Testing Payment Status');
  
  // ===========================================
  // Test 1: Check Payment Status (Public)
  // ===========================================
  group('Public: Check Payment Status', () => {
    console.log('\n✅ Test 1: Check payment status...');
    
    const testOrderId = 'test-order-123';
    
    const res = http.get(
      `${BASE_URL}/api/payments/check-status/${testOrderId}`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Status] status is valid': (r) => r.status === 200 || r.status === 401 || r.status === 404,
      '[Status] has JSON response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
      '[Status] has status field': (r) => {
        if (r.status === 401 || r.status === 404) return true;
        try {
          const body = r.json();
          return body.hasOwnProperty('status') || 
                 body.hasOwnProperty('error') ||
                 body.hasOwnProperty('detail');
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  // ===========================================
  // Test 2: Invalid Order ID
  // ===========================================
  group('Invalid: Order ID', () => {
    console.log('\n❌ Test 2: Invalid order ID...');
    
    const res = http.get(
      `${BASE_URL}/api/payments/check-status/invalid-id-99999`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Invalid] status is valid': (r) => r.status === 401 || r.status === 404 || r.status === 400,
      '[Invalid] has response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
    });
  });
  
  console.log('\n✅ Payment status test completed\n');
}
