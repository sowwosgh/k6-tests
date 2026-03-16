import http from 'k6/http';
import { check, group } from 'k6';
import { BASE_URL } from '../../config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    'checks{type:favorites}': ['rate>0.90'],
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
 * Add to Favorites Test
 * 
 * Tests adding profiles to favorites list.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n⭐ Testing Add to Favorites');
  
  // ===========================================
  // Test 1: Add Worker to Favorites
  // ===========================================
  group('Favorites: Add Worker', () => {
    console.log('\n✅ Test 1: Add worker to favorites...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      profile_type: 'worker',
      profile_id: 1,
    });
    
    const res = http.post(
      `${BASE_URL}/api/favorites`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[AddWorker] status is valid': (r) => r.status === 200 || r.status === 201 || r.status === 409,
      '[AddWorker] has JSON response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
      '[AddWorker] success or duplicate': (r) => {
        if (r.status === 409) return true; // Already in favorites
        try {
          const body = r.json();
          return body.hasOwnProperty('ok') || body.hasOwnProperty('success') || body.hasOwnProperty('id');
        } catch (e) {
          return false;
        }
      },
    }, { type: 'favorites' });
  });
  
  // ===========================================
  // Test 2: Add Order to Favorites
  // ===========================================
  group('Favorites: Add Order', () => {
    console.log('\n✅ Test 2: Add order to favorites...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      profile_type: 'order',
      profile_id: 1,
    });
    
    const res = http.post(
      `${BASE_URL}/api/favorites`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[AddOrder] status is valid': (r) => r.status === 200 || r.status === 201 || r.status === 409,
      '[AddOrder] has response': (r) => r.body.length > 0,
    }, { type: 'favorites' });
  });
  
  // ===========================================
  // Test 3: Invalid Profile Type
  // ===========================================
  group('Favorites: Invalid Type', () => {
    console.log('\n❌ Test 3: Add invalid profile type...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      profile_type: 'invalid',
      profile_id: 1,
    });
    
    const res = http.post(
      `${BASE_URL}/api/favorites`,
      payload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Invalid] error status': (r) => r.status === 400 || r.status === 422,
      '[Invalid] has error': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('error') || body.hasOwnProperty('detail');
        } catch (e) {
          return false;
        }
      },
    }, { type: 'favorites' });
  });
  
  // ===========================================
  // Test 4: Missing Parameters
  // ===========================================
  group('Favorites: Missing Params', () => {
    console.log('\n❌ Test 4: Missing parameters...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const payload = JSON.stringify({
      profile_type: 'worker',
      // Missing profile_id
    });
    
    const res = http.post(
      `${BASE_URL}/api/favorites`,
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
    }, { type: 'favorites' });
  });
  
  // ===========================================
  // Test 5: Unauthenticated Access
  // ===========================================
  group('Favorites: Unauthenticated', () => {
    console.log('\n🔒 Test 5: Unauthenticated access...');
    
    const payload = JSON.stringify({
      profile_type: 'worker',
      profile_id: 1,
    });
    
    const res = http.post(
      `${BASE_URL}/api/favorites`,
      payload,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Unauth] access denied': (r) => r.status === 401 || r.status === 403,
      '[Unauth] has error response': (r) => r.body.length > 0,
    }, { type: 'favorites' });
  });
  
  console.log('\n✅ Add to favorites test completed\n');
}
