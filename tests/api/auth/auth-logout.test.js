import http from 'k6/http';
import { check, group } from 'k6';
import { loginAndGetSession } from '../../../utils/auth.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],
    http_req_duration: ['p(95)<1000'],
  }
};

const BASE_URL = 'https://sowwos.ru';

export default function() {
  group('Auth Logout - With Active Session', () => {
    // First, login to get a session
    const sessionId = loginAndGetSession(http, BASE_URL, '+79001234567', 'test123');
    if (!sessionId) {
      throw new Error('Failed to authenticate for logout test');
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': `sessionid=${sessionId}`
    };
    
    // Perform logout
    const response = http.post(`${BASE_URL}/api/auth/logout`, null, { headers });
    
    check(response, {
      'status is 200': (r) => r.status === 200,
      'has success message': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.message && body.message.includes('успешно');
        } catch (e) {
          return false;
        }
      }
    });
    
    // Try to access protected endpoint after logout
    const meResponse = http.get(`${BASE_URL}/api/auth/me`, { headers });
    
    check(meResponse, {
      'after logout: cannot access /me': (r) => r.status === 401 || r.status === 403
    });
  });
  
  group('Auth Logout - Without Session', () => {
    // Try to logout without being logged in
    const response = http.post(`${BASE_URL}/api/auth/logout`, null, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    check(response, {
      'status is 200 (logout always succeeds)': (r) => r.status === 200,
      'not 500 error': (r) => r.status !== 500
    });
  });
  
  group('Auth Logout - Idempotency', () => {
    // Logout twice with same session
    const sessionId = loginAndGetSession(http, BASE_URL, '+79001234567', 'test123');
    if (!sessionId) {
      throw new Error('Failed to authenticate');
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': `sessionid=${sessionId}`
    };
    
    // First logout
    http.post(`${BASE_URL}/api/auth/logout`, null, { headers });
    
    // Second logout with same session
    const response = http.post(`${BASE_URL}/api/auth/logout`, null, { headers });
    
    check(response, {
      'second logout: still 200': (r) => r.status === 200,
      'not 500 error': (r) => r.status !== 500
    });
  });
}
