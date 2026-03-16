import http from 'k6/http';
import { check, group } from 'k6';
import { loginAndGetSession } from '../../../utils/auth.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.90'],  // Allow some flexibility
    http_req_duration: ['p(95)<1000'],
  }
};

const BASE_URL = 'https://sowwos.ru';

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
  
  // Test data - apply to vacancy id=1
  const workerProfileId = 1;  // Assuming worker profile exists from seed data
  const vacancyId = 1;  // Assuming vacancy exists
  
  group('Applications Apply - Success', () => {
    const response = http.post(`${BASE_URL}/api/apply`,
      JSON.stringify({
        worker_id: workerProfileId,
        vacancy_id: vacancyId
      }),
      { headers }
    );
    
    check(response, {
      'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'has response body': (r) => r.body && r.body.length > 0,
      'body is valid JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch (e) {
          return false;
        }
      },
      'response indicates success': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.ok === true || body.id || body.application_id;
        } catch (e) {
          return false;
        }
      }
    });
  });
  
  group('Applications Count', () => {
    const response = http.get(`${BASE_URL}/api/applications/count`,
      { headers }
    );
    
    check(response, {
      'status is 200': (r) => r.status === 200,
      'has count': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('count') || 
                 body.hasOwnProperty('sent_count') ||
                 body.hasOwnProperty('received_count');
        } catch (e) {
          return false;
        }
      }
    });
  });
  
  group('Applications List - Sent', () => {
    const response = http.get(`${BASE_URL}/api/applications?direction=sent`,
      { headers }
    );
    
    check(response, {
      'status is 200': (r) => r.status === 200,
      'is array or has applications': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || 
                 (typeof body === 'object' && body.applications) ||
                 (typeof body === 'object' && body.results);
        } catch (e) {
          return false;
        }
      }
    });
  });
  
  group('Applications List - Received', () => {
    const response = http.get(`${BASE_URL}/api/applications?direction=received`,
      { headers }
    );
    
    check(response, {
      'status is 200': (r) => r.status === 200,
      'is array or has applications': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || 
                 (typeof body === 'object' && body.applications) ||
                 (typeof body === 'object' && body.results);
        } catch (e) {
          return false;
        }
      }
    });
  });
  
  group('Applications - Without Auth', () => {
    const response = http.post(`${BASE_URL}/api/apply`,
      JSON.stringify({
        worker_id: workerProfileId,
        vacancy_id: vacancyId
      }),
      { headers: { 'Content-Type': 'application/json' } }  // No auth
    );
    
    check(response, {
      'status is 401 or 403': (r) => r.status === 401 || r.status === 403,
      'not 500 error': (r) => r.status !== 500
    });
  });
}
