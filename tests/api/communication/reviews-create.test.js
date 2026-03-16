import http from 'k6/http';
import { check, group } from 'k6';
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
 * Create Review Test
 * 
 * Tests creating reviews for profiles.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n⭐ Testing Create Review');
  
  // ===========================================
  // Test 1: Create Valid Review
  // ===========================================
  group('Reviews: Create Valid', () => {
    console.log('\n✅ Test 1: Create valid review...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      profile_type: 'worker',
      profile_id: 1,
      rating: 5,
      text: 'Отличный специалист! Рекомендую.',
    });
    
    const res = http.post(
      `${BASE_URL}/api/reviews`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[Create] status is valid': (r) => r.status === 200 || r.status === 201 || r.status === 409,
      '[Create] has JSON response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
      '[Create] success or duplicate': (r) => {
        if (r.status === 409) return true; // Duplicate review
        try {
          const body = r.json();
          return body.hasOwnProperty('ok') || 
                 body.hasOwnProperty('success') ||
                 body.hasOwnProperty('id') ||
                 body.hasOwnProperty('review');
        } catch (e) {
          return false;
        }
      },
    }, { type: 'reviews' });
  });
  
  // ===========================================
  // Test 2: Invalid Rating
  // ===========================================
  group('Reviews: Invalid Rating', () => {
    console.log('\n❌ Test 2: Create review with invalid rating...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      profile_type: 'worker',
      profile_id: 2,
      rating: 10, // Invalid rating (should be 1-5)
      text: 'Test review',
    });
    
    const res = http.post(
      `${BASE_URL}/api/reviews`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[InvalidRating] validation error': (r) => r.status === 400 || r.status === 422,
      '[InvalidRating] has error': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('error') || body.hasOwnProperty('detail');
        } catch (e) {
          return false;
        }
      },
    }, { type: 'reviews' });
  });
  
  // ===========================================
  // Test 3: Empty Text
  // ===========================================
  group('Reviews: Empty Text', () => {
    console.log('\n❌ Test 3: Create review with empty text...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      profile_type: 'worker',
      profile_id: 3,
      rating: 4,
      text: '',
    });
    
    const res = http.post(
      `${BASE_URL}/api/reviews`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[EmptyText] status is valid': (r) => r.status === 200 || r.status === 201 || r.status === 400 || r.status === 422,
      '[EmptyText] has response': (r) => r.body.length > 0,
    }, { type: 'reviews' });
  });
  
  // ===========================================
  // Test 4: Missing Parameters
  // ===========================================
  group('Reviews: Missing Params', () => {
    console.log('\n❌ Test 4: Missing parameters...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      profile_type: 'worker',
      // Missing profile_id, rating, text
    });
    
    const res = http.post(
      `${BASE_URL}/api/reviews`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Missing] validation error': (r) => r.status === 400 || r.status === 422,
      '[Missing] has error message': (r) => r.body.length > 0,
    }, { type: 'reviews' });
  });
  
  // ===========================================
  // Test 5: Invalid Profile Type
  // ===========================================
  group('Reviews: Invalid Profile Type', () => {
    console.log('\n❌ Test 5: Invalid profile type...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      profile_type: 'invalid',
      profile_id: 1,
      rating: 5,
      text: 'Test',
    });
    
    const res = http.post(
      `${BASE_URL}/api/reviews`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[InvalidType] error status': (r) => r.status === 400 || r.status === 422,
      '[InvalidType] has error': (r) => r.body.length > 0,
    }, { type: 'reviews' });
  });
  
  // ===========================================
  // Test 6: Unauthenticated Access
  // ===========================================
  group('Reviews: Unauthenticated Create', () => {
    console.log('\n🔒 Test 6: Unauthenticated review creation...');
    
    const payload = JSON.stringify({
      profile_type: 'worker',
      profile_id: 1,
      rating: 5,
      text: 'Test review',
    });
    
    const res = http.post(
      `${BASE_URL}/api/reviews`,
      payload,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[UnauthCreate] access denied': (r) => r.status === 401 || r.status === 403,
      '[UnauthCreate] has error': (r) => r.body.length > 0,
    }, { type: 'reviews' });
  });
  
  console.log('\n✅ Create review test completed\n');
}
