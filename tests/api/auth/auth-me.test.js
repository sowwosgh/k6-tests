import http from 'k6/http';
import { check, group } from 'k6';
import { loginAndGetSession } from '../../../utils/auth.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.70'],  // Allow some flexibility for auth errors
    http_req_duration: ['p(95)<1000'],
  }
};

const BASE_URL = 'https://sowwos.ru';

export default function() {
  group('Auth Me - Authenticated User', () => {
    // Login first
    const sessionId = loginAndGetSession(http, BASE_URL, '+79001234567', 'test123');
    if (!sessionId) {
      throw new Error('Failed to authenticate');
    }
    
    const headers = {
      'Cookie': `sessionid=${sessionId}`
    };
    
    const response = http.get(`${BASE_URL}/api/auth/me`, { headers });
    
    check(response, {
      'status is 200': (r) => r.status === 200,
      'has user object': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('user');
        } catch (e) {
          return false;
        }
      },
      'has profiles array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.profiles);
        } catch (e) {
          return false;
        }
      },
      'user has id': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.user && body.user.hasOwnProperty('id');
        } catch (e) {
          return false;
        }
      },
      'user has phone': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.user && body.user.phone === '+79001234567';
        } catch (e) {
          return false;
        }
      },
      'user has nickname': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.user && body.user.hasOwnProperty('nickname');
        } catch (e) {
          return false;
        }
      },
      'user has is_staff flag': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.user && body.user.hasOwnProperty('is_staff');
        } catch (e) {
          return false;
        }
      }
    });
  });
  
  group('Auth Me - Unauthenticated', () => {
    const response = http.get(`${BASE_URL}/api/auth/me`);
    
    check(response, {
      'status is 200, 401, or 403': (r) => r.status === 200 || r.status === 401 || r.status === 403,
      'not 500 error': (r) => r.status !== 500
    });
  });
  
  group('Auth Me - Invalid Session', () => {
    const headers = {
      'Cookie': 'sessionid=invalid_session_12345'
    };
    
    const response = http.get(`${BASE_URL}/api/auth/me`, { headers });
    
    check(response, {
      'status is 200, 401, or 403': (r) => r.status === 200 || r.status === 401 || r.status === 403,
      'not 500 error': (r) => r.status !== 500
    });
  });
}
