import http from 'k6/http';
import { check, group } from 'k6';
import { generatePhone } from '../../../utils/generators.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.85'],
    http_req_duration: ['p(95)<1000'],
  }
};

const BASE_URL = 'https://sowwos.ru';

export default function() {
  group('Auth Register - New User', () => {
    const newPhone = generatePhone();
    const password = 'test123456';
    
    const response = http.post(`${BASE_URL}/api/auth/register`,
      JSON.stringify({
        phone: newPhone,
        password: password
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    check(response, {
      'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'has user_id': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('user_id');
        } catch (e) {
          return false;
        }
      },
      'has phone': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.phone === newPhone;
        } catch (e) {
          return false;
        }
      },
      'has nickname': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('nickname') && body.nickname.length > 0;
        } catch (e) {
          return false;
        }
      },
      'has empty profiles array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.profiles) && body.profiles.length === 0;
        } catch (e) {
          return false;
        }
      },
      'has success message': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.message && body.message.includes('успешн');
        } catch (e) {
          return false;
        }
      }
    });
  });
  
  group('Auth Register - Duplicate Phone', () => {
    // Try to register with existing phone
    const existingPhone = '+79001234567';
    
    const response = http.post(`${BASE_URL}/api/auth/register`,
      JSON.stringify({
        phone: existingPhone,
        password: 'test123'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    check(response, {
      'status is 400': (r) => r.status === 400,
      'has error about duplicate': (r) => {
        try {
          const body = JSON.parse(r.body);
          return (body.error && body.error.message.includes('зарегистрирован')) ||
                 (body.detail && body.detail.includes('зарегистрирован'));
        } catch (e) {
          return false;
        }
      }
    });
  });
  
  group('Auth Register - Missing Phone', () => {
    const response = http.post(`${BASE_URL}/api/auth/register`,
      JSON.stringify({
        password: 'test123'
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    check(response, {
      'status is 4xx': (r) => r.status >= 400 && r.status < 500,
      'not 500 error': (r) => r.status !== 500
    });
  });
  
  group('Auth Register - Missing Password', () => {
    const response = http.post(`${BASE_URL}/api/auth/register`,
      JSON.stringify({
        phone: generatePhone()
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    check(response, {
      'status is 4xx': (r) => r.status >= 400 && r.status < 500,
      'not 500 error': (r) => r.status !== 500
    });
  });
  
  group('Auth Register - Weak Password', () => {
    const response = http.post(`${BASE_URL}/api/auth/register`,
      JSON.stringify({
        phone: generatePhone(),
        password: '123'  // Too short
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    check(response, {
      'status is 400 or accepts': (r) => r.status === 400 || r.status === 200 || r.status === 201,
      'not 500 error': (r) => r.status !== 500
    });
  });
}
