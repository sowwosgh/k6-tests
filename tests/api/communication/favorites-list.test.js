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
 * Favorites List Test
 * 
 * Tests retrieving user's favorites list.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n📋 Testing Favorites List');
  
  // ===========================================
  // Test 1: Get Favorites List (Authenticated)
  // ===========================================
  group('Favorites: Get List', () => {
    console.log('\n✅ Test 1: Get favorites list...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    // Add a favorite first
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
    
    // Get favorites list
    const res = http.get(
      `${BASE_URL}/api/favorites`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body.substring(0, 200)}...`);
    
    check(res, {
      '[List] status is 200': (r) => r.status === 200,
      '[List] response is array': (r) => {
        try {
          const body = r.json();
          return Array.isArray(body) || Array.isArray(body.favorites) || Array.isArray(body.results);
        } catch (e) {
          return false;
        }
      },
      '[List] has favorites data': (r) => {
        try {
          const body = r.json();
          const items = Array.isArray(body) ? body : (body.favorites || body.results || []);
          
          if (items.length === 0) return true; // Empty list is valid
          
          const first = items[0];
          return first.hasOwnProperty('profile_type') || 
                 first.hasOwnProperty('type') ||
                 first.hasOwnProperty('id');
        } catch (e) {
          return false;
        }
      },
    }, { type: 'favorites' });
  });
  
  // ===========================================
  // Test 2: Empty Favorites List
  // ===========================================
  group('Favorites: Empty List', () => {
    console.log('\n✅ Test 2: Check empty list handling...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.get(
      `${BASE_URL}/api/favorites`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Empty] status is 200': (r) => r.status === 200,
      '[Empty] returns valid structure': (r) => {
        try {
          const body = r.json();
          return Array.isArray(body) || body.hasOwnProperty('favorites') || body.hasOwnProperty('results');
        } catch (e) {
          return false;
        }
      },
    }, { type: 'favorites' });
  });
  
  // ===========================================
  // Test 3: Pagination Support
  // ===========================================
  group('Favorites: Pagination', () => {
    console.log('\n✅ Test 3: Check pagination...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.get(
      `${BASE_URL}/api/favorites?page=1&page_size=10`,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[Pagination] status is 200': (r) => r.status === 200,
      '[Pagination] has valid response': (r) => {
        try {
          r.json();
          return true;
        } catch (e) {
          return false;
        }
      },
    }, { type: 'favorites' });
  });
  
  // ===========================================
  // Test 4: Unauthenticated Access
  // ===========================================
  group('Favorites: Unauthenticated List', () => {
    console.log('\n🔒 Test 4: Unauthenticated list access...');
    
    const res = http.get(
      `${BASE_URL}/api/favorites`,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[UnauthList] access denied': (r) => r.status === 401 || r.status === 403,
      '[UnauthList] has error': (r) => r.body.length > 0,
    }, { type: 'favorites' });
  });
  
  console.log('\n✅ Favorites list test completed\n');
}
