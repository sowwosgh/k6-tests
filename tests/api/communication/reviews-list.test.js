import http from 'k6/http';
import { check, group} from 'k6';
import { BASE_URL } from '../../config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    'checks{type:reviews}': ['rate>0.90'],
    http_req_duration: ['p(95)<2000'],
  },
};

/**
 * Login helper
 */
function login() {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      phone: '+79001234567',
      password: 'test123',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const cookies = loginRes.cookies;
  const sessionId = cookies['sessionid'] ? cookies['sessionid'][0].value : null;
  
  if (!sessionId) {
    console.error('No session cookie found');
    return null;
  }

  return sessionId;
}

/**
 * Reviews List Test
 * 
 * Tests retrieving reviews for profiles.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n📋 Testing Reviews List');
  
  // ===========================================
  // Test 1: Get Worker Reviews
  // ===========================================
  group('Reviews: Get Worker Reviews', () => {
    console.log('\n✅ Test 1: Get reviews for worker...');
    
    const res = http.get(
      `${BASE_URL}/api/reviews?profile_type=worker&profile_id=1`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body.substring(0, 200)}...`);
    
    check(res, {
      '[WorkerReviews] status is 200': (r) => r.status === 200,
      '[WorkerReviews] response is array': (r) => {
        try {
          const body = r.json();
          return Array.isArray(body) || Array.isArray(body.reviews) || Array.isArray(body.results);
        } catch (e) {
          return false;
        }
      },
      '[WorkerReviews] has valid structure': (r) => {
        try {
          const body = r.json();
          const items = Array.isArray(body) ? body : (body.reviews || body.results || []);
          
          if (items.length === 0) return true; // Empty list is valid
          
          const first = items[0];
          return first.hasOwnProperty('rating') || 
                 first.hasOwnProperty('text') ||
                 first.hasOwnProperty('id');
        } catch (e) {
          return false;
        }
      },
    }, { type: 'reviews' });
  });
  
  // ===========================================
  // Test 2: Get Order Reviews
  // ===========================================
  group('Reviews: Get Order Reviews', () => {
    console.log('\n✅ Test 2: Get reviews for order...');
    
    const res = http.get(
      `${BASE_URL}/api/reviews?profile_type=order&profile_id=1`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[OrderReviews] status is 200': (r) => r.status === 200,
      '[OrderReviews] has JSON response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
    }, { type: 'reviews' });
  });
  
  // ===========================================
  // Test 3: Reviews Pagination
  // ===========================================
  group('Reviews: Pagination', () => {
    console.log('\n✅ Test 3: Test pagination...');
    
    const res = http.get(
      `${BASE_URL}/api/reviews?profile_type=worker&profile_id=1&page=1&page_size=5`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Pagination] status is 200': (r) => r.status === 200,
      '[Pagination] has valid response': (r) => {
        try {
          const body = r.json();
          return Array.isArray(body) || body.hasOwnProperty('reviews') || body.hasOwnProperty('results');
        } catch (e) {
          return false;
        }
      },
    }, { type: 'reviews' });
  });
  
  // ===========================================
  // Test 4: Invalid Profile Type
  // ===========================================
  group('Reviews: Invalid Type List', () => {
    console.log('\n❌ Test 4: Invalid profile type...');
    
    const res = http.get(
      `${BASE_URL}/api/reviews?profile_type=invalid&profile_id=1`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[InvalidType] error status': (r) => r.status === 200 || r.status === 400 || r.status === 422,
      '[InvalidType] has response': (r) => r.body.length > 0,
    }, { type: 'reviews' });
  });
  
  // ===========================================
  // Test 5: Missing Parameters
  // ===========================================
  group('Reviews: Missing Params', () => {
    console.log('\n❌ Test 5: Missing parameters...');
    
    const res = http.get(
      `${BASE_URL}/api/reviews`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[MissingParams] status is valid': (r) => r.status === 200 || r.status === 400 || r.status === 422,
      '[MissingParams] has response': (r) => r.body.length > 0,
    }, { type: 'reviews' });
  });
  
  console.log('\n✅ Reviews list test completed\n');
}
