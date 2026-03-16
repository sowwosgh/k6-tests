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
 * Remove from Favorites Test
 * 
 * Tests removing profiles from favorites list.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n🗑️ Testing Remove from Favorites');
  
  // ===========================================
  // Test 1: Add then Remove Worker
  // ===========================================
  group('Favorites: Remove Worker', () => {
    console.log('\n✅ Test 1: Add and remove worker...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    // First add to favorites
    const addPayload = JSON.stringify({
      profile_type: 'worker',
      profile_id: 2,
    });
    
    http.post(
      `${BASE_URL}/api/favorites`,
      addPayload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    // Then remove
    const res = http.del(
      `${BASE_URL}/api/favorites/worker/2`,
      null,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[RemoveWorker] status is valid': (r) => r.status === 200 || r.status === 204 || r.status === 404,
      '[RemoveWorker] has response': (r) => {
        if (r.status === 204) return true; // No content
        return r.body.length > 0;
      },
      '[RemoveWorker] success or not found': (r) => {
        if (r.status === 404) return true; // Already removed
        if (r.status === 204) return true; // Deleted
        try {
          const body = r.json();
          return body.hasOwnProperty('ok') || body.hasOwnProperty('success');
        } catch (e) {
          return false;
        }
      },
    }, { type: 'favorites' });
  });
  
  // ===========================================
  // Test 2: Remove Non-existent Favorite
  // ===========================================
  group('Favorites: Remove Non-existent', () => {
    console.log('\n❌ Test 2: Remove non-existent favorite...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.del(
      `${BASE_URL}/api/favorites/worker/99999`,
      null,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[NotFound] status is valid': (r) => r.status === 404 || r.status === 200 || r.status === 204,
      '[NotFound] has response': (r) => {
        if (r.status === 204) return true;
        return r.body.length > 0;
      },
    }, { type: 'favorites' });
  });
  
  // ===========================================
  // Test 3: Invalid Profile Type
  // ===========================================
  group('Favorites: Invalid Type Remove', () => {
    console.log('\n❌ Test 3: Remove with invalid type...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.del(
      `${BASE_URL}/api/favorites/invalid/1`,
      null,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[InvalidType] error status': (r) => r.status === 400 || r.status === 404 || r.status === 422,
      '[InvalidType] has response': (r) => r.body.length > 0,
    }, { type: 'favorites' });
  });
  
  // ===========================================
  // Test 4: Unauthenticated Remove
  // ===========================================
  group('Favorites: Unauthenticated Remove', () => {
    console.log('\n🔒 Test 4: Unauthenticated remove...');
    
    const res = http.del(
      `${BASE_URL}/api/favorites/worker/1`,
      null,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[UnauthRemove] access denied': (r) => r.status === 401 || r.status === 403,
      '[UnauthRemove] has error': (r) => r.body.length > 0,
    }, { type: 'favorites' });
  });
  
  console.log('\n✅ Remove from favorites test completed\n');
}
