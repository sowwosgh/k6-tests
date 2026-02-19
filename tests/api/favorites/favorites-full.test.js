import http from 'k6/http';
import { check, group } from 'k6';
import { loginAndGetSession, authHeaders } from '../../../utils/auth.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],
    http_req_duration: ['p(95)<1000'],
  }
};

const BASE_URL = 'http://localhost:8000';

export default function() {
  // Get authentication session
  const sessionId = loginAndGetSession(http, BASE_URL, '+79001234567', 'test123');
  if (!sessionId) {
    throw new Error('Failed to authenticate');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Cookie': `sessionid=${sessionId}`
  };
  
  // Test data - use worker profile id=1 (from seed data)
  const testProfileType = 'worker';
  const testProfileId = 1;
  
  group('Favorites Add - Success', () => {
    const response = http.post(`${BASE_URL}/api/favorites`,
      JSON.stringify({
        profile_type: testProfileType,
        profile_id: testProfileId
      }),
      { headers: { ...headers, 'Content-Type': 'application/json' } }
    );
    
    check(response, {
      'status is 200': (r) => r.status === 200,
      'ok is true': (r) => {
        const body = JSON.parse(r.body);
        return body.ok === true;
      },
      'has id': (r) => {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('id');
      },
      'has created field': (r) => {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('created');
      }
    });
  });
  
  group('Favorites Add - Idempotency (duplicate)', () => {
    // Add same favorite again - should return existing
    const response = http.post(`${BASE_URL}/api/favorites`,
      JSON.stringify({
        profile_type: testProfileType,
        profile_id: testProfileId
      }),
      { headers: { ...headers, 'Content-Type': 'application/json' } }
    );
    
    check(response, {
      'status is 200': (r) => r.status === 200,
      'ok is true': (r) => {
        const body = JSON.parse(r.body);
        return body.ok === true;
      },
      'created is false (already exists)': (r) => {
        const body = JSON.parse(r.body);
        return body.created === false;
      }
    });
  });
  
  group('Favorites List - Get All', () => {
    const response = http.get(`${BASE_URL}/api/favorites`,
      { headers }
    );
    
    check(response, {
      'status is 200': (r) => r.status === 200,
      'body is valid JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch (e) {
          return false;
        }
      },
      'is array or object': (r) => {
        const body = JSON.parse(r.body);
        return Array.isArray(body) || typeof body === 'object';
      },
      'contains added favorite (if array)': (r) => {
        const body = JSON.parse(r.body);
        if (!Array.isArray(body)) return true;  // Skip if not array
        return body.some(fav => 
          fav.profile_type === testProfileType && 
          fav.profile_id === testProfileId
        );
      }
    });
  });
  
  group('Favorites Check - Specific Item', () => {
    const response = http.get(
      `${BASE_URL}/api/favorites/check?profile_type=${testProfileType}&profile_id=${testProfileId}`,
      { headers }
    );
    
    check(response, {
      'status is 200': (r) => r.status === 200,
      'is_favorite is true': (r) => {
        const body = JSON.parse(r.body);
        return body.is_favorite === true;
      }
    });
  });
  
  group('Favorites Remove - Success', () => {
    const response = http.del(
      `${BASE_URL}/api/favorites/${testProfileType}/${testProfileId}`,
      null,
      { headers }
    );
    
    check(response, {
      'status is 200': (r) => r.status === 200,
      'ok is true': (r) => {
        const body = JSON.parse(r.body);
        return body.ok === true;
      },
      'deleted is true': (r) => {
        const body = JSON.parse(r.body);
        return body.deleted === true;
      }
    });
  });
  
  group('Favorites Remove - Idempotency (already deleted)', () => {
    // Try to remove again
    const response = http.del(
      `${BASE_URL}/api/favorites/${testProfileType}/${testProfileId}`,
      null,
      { headers }
    );
    
    check(response, {
      'status is 200': (r) => r.status === 200,
      'ok is true': (r) => {
        const body = JSON.parse(r.body);
        return body.ok === true;
      },
      'deleted is false (nothing to delete)': (r) => {
        const body = JSON.parse(r.body);
        return body.deleted === false;
      }
    });
  });
  
  group('Favorites Check - After Delete', () => {
    const response = http.get(
      `${BASE_URL}/api/favorites/check?profile_type=${testProfileType}&profile_id=${testProfileId}`,
      { headers }
    );
    
    check(response, {
      'status is 200': (r) => r.status === 200,
      'is_favorite is false': (r) => {
        const body = JSON.parse(r.body);
        return body.is_favorite === false;
      }
    });
  });
  
  group('Favorites Add - Without Auth', () => {
    const response = http.post(`${BASE_URL}/api/favorites`,
      JSON.stringify({
        profile_type: testProfileType,
        profile_id: testProfileId
      }),
      { headers: { 'Content-Type': 'application/json' } }  // No auth headers
    );
    
    check(response, {
      'status is 401 or 403': (r) => r.status === 401 || r.status === 403,
      'not 500 error': (r) => r.status !== 500
    });
  });
}
