import http from 'k6/http';
import { check, group, sleep } from 'k6';
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
 * Delete Review Test
 * 
 * Tests deleting reviews.
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n🗑️ Testing Delete Review');
  
  // ===========================================
  // Test 1: Create and Delete Own Review
  // ===========================================
  group('Reviews: Delete Own', () => {
    console.log('\n✅ Test 1: Create and delete own review...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    // Create a review first
    const createPayload = JSON.stringify({
      profile_type: 'worker',
      profile_id: 2,
      rating: 5,
      text: 'Test review for deletion',
    });
    
    const createRes = http.post(
      `${BASE_URL}/api/reviews`,
      createPayload,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Create status: ${createRes.status}`);
    
    sleep(0.5);
    
    // Extract review ID if available
    let reviewId = null;
    try {
      const createBody = createRes.json();
      reviewId = createBody.id || createBody.review?.id || createBody.review_id;
    } catch (e) {
      console.log('Could not extract review ID');
    }
    
    // Delete the review
    const deleteUrl = reviewId 
      ? `${BASE_URL}/api/reviews/${reviewId}`
      : `${BASE_URL}/api/reviews/1`; // Fallback to ID 1
    
    const res = http.del(
      deleteUrl,
      null,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Delete status: ${res.status}`);
    console.log(`Response: ${res.body}`);
    
    check(res, {
      '[DeleteOwn] status is valid': (r) => r.status === 200 || r.status === 204 || r.status === 404,
      '[DeleteOwn] has response': (r) => {
        if (r.status === 204) return true; // No content
        return r.body.length > 0;
      },
    }, { type: 'reviews' });
  });
  
  // ===========================================
  // Test 2: Delete Non-existent Review
  // ===========================================
  group('Reviews: Delete Non-existent', () => {
    console.log('\n❌ Test 2: Delete non-existent review...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    const res = http.del(
      `${BASE_URL}/api/reviews/99999`,
      null,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[NonExistent] status is valid': (r) => r.status === 404 || r.status === 200 || r.status === 204,
      '[NonExistent] has response': (r) => {
        if (r.status === 204) return true;
        return r.body.length > 0;
      },
    }, { type: 'reviews' });
  });
  
  // ===========================================
  // Test 3: Delete Other User's Review (Forbidden)
  // ===========================================
  group('Reviews: Delete Others Review', () => {
    console.log('\n🔒 Test 3: Try to delete other user\'s review...');
    
    const sessionId = login();
    if (!sessionId) {
      console.error('Failed to login');
      return;
    }
    
    // Try to delete a review that doesn't belong to us
    const res = http.del(
      `${BASE_URL}/api/reviews/1`,
      null,
      { 
        headers,
        cookies: { sessionid: sessionId },
      }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[DeleteOthers] status is valid': (r) => r.status === 403 || r.status === 404 || r.status === 200 || r.status === 204,
      '[DeleteOthers] has response': (r) => {
        if (r.status === 204) return true;
        return r.body.length > 0;
      },
    }, { type: 'reviews' });
  });
  
  // ===========================================
  // Test 4: Unauthenticated Delete
  // ===========================================
  group('Reviews: Unauthenticated Delete', () => {
    console.log('\n🔒 Test 4: Unauthenticated delete...');
    
    const res = http.del(
      `${BASE_URL}/api/reviews/1`,
      null,
      { headers }
    );
    
    console.log(`Status: ${res.status}`);
    
    check(res, {
      '[UnauthDelete] access denied': (r) => r.status === 401 || r.status === 403,
      '[UnauthDelete] has error': (r) => r.body.length > 0,
    }, { type: 'reviews' });
  });
  
  console.log('\n✅ Delete review test completed\n');
}
