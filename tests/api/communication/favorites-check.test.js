import http from 'k6/http';
import { check, group, sleep } from 'k6';
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
 * Check Favorite Status Test
 * 
 * Tests checking if a profile is in favorites.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n🔍 Testing Favorites Check');
  
  // ===========================================
  // Test 1: Check Favorite Status (In Favorites)
  // ===========================================
  group('Favorites: Check Status True', () => {
    console.log('\n✅ Test 1: Check if profile is in favorites...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    // Add to favorites first
    const addPayload = JSON.stringify({
      profile_type: 'worker',
      profile_id: 1,
    });
    
    http.post(
      `${BASE_URL}/api/favorites`,
      addPayload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    sleep(0.5);
    
    // Check status
    const checkPayload = JSON.stringify({
      profile_type: 'worker',
      profile_id: 1,
    });
    
    const res = http.post(
      `${BASE_URL}/api/favorites/check`,
      checkPayload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[CheckTrue] status is 200': (r) => r.status === 200,
      '[CheckTrue] has JSON response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
      '[CheckTrue] has is_favorite field': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('is_favorite') || 
                 body.hasOwnProperty('isFavorite') ||
                 body.hasOwnProperty('in_favorites');
        } catch (e) {
          return false;
        }
      },
    }, { type: 'favorites' });
  });
  
  // ===========================================
  // Test 2: Check Status (Not in Favorites)
  // ===========================================
  group('Favorites: Check Status False', () => {
    console.log('\n✅ Test 2: Check profile not in favorites...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const checkPayload = JSON.stringify({
      profile_type: 'worker',
      profile_id: 99999,
    });
    
    const res = http.post(
      `${BASE_URL}/api/favorites/check`,
      checkPayload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[CheckFalse] status is 200': (r) => r.status === 200,
      '[CheckFalse] has favorite status': (r) => {
        try {
          const body = r.json();
          return body.hasOwnProperty('is_favorite') || 
                 body.hasOwnProperty('isFavorite') ||
                 body.hasOwnProperty('in_favorites');
        } catch (e) {
          return false;
        }
      },
    }, { type: 'favorites' });
  });
  
  // ===========================================
  // Test 3: Invalid Profile Type
  // ===========================================
  group('Favorites: Check Invalid Type', () => {
    console.log('\n❌ Test 3: Check with invalid profile type...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const checkPayload = JSON.stringify({
      profile_type: 'invalid',
      profile_id: 1,
    });
    
    const res = http.post(
      `${BASE_URL}/api/favorites/check`,
      checkPayload,
      { 
        headers,
        cookies: { sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[CheckInvalid] error status': (r) => r.status === 400 || r.status === 422,
      '[CheckInvalid] has error': (r) => {
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
  group('Favorites: Check Missing Params', () => {
    console.log('\n❌ Test 4: Check with missing parameters...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const checkPayload = JSON.stringify({
      profile_type: 'worker',
      // Missing profile_id
    });
    
    const res = http.post(
      `${BASE_URL}/api/favorites/check`,
      checkPayload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[CheckMissing] validation error': (r) => r.status === 400 || r.status === 422,
      '[CheckMissing] has error': (r) => r.body.length > 0,
    }, { type: 'favorites' });
  });
  
  // ===========================================
  // Test 5: Unauthenticated Check
  // ===========================================
  group('Favorites: Unauthenticated Check', () => {
    console.log('\n🔒 Test 5: Unauthenticated check...');
    
    const checkPayload = JSON.stringify({
      profile_type: 'worker',
      profile_id: 1,
    });
    
    const res = http.post(
      `${BASE_URL}/api/favorites/check`,
      checkPayload,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[UnauthCheck] access denied': (r) => r.status === 401 || r.status === 403,
      '[UnauthCheck] has error': (r) => r.body.length > 0,
    }, { type: 'favorites' });
  });
  
  console.log('\n✅ Favorites check test completed\n');
}
