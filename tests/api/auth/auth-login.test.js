import http from 'k6/http';
import { check, group } from 'k6';
import { generatePhone } from '../../../utils/generators.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],  // Auth tests must pass 100%
    http_req_duration: ['p(95)<1000'],  // Allow 1s for database queries
  }
};

const BASE_URL = 'https://sowwos.ru';

export default function() {
  // Use existing test user from backend seed data
  const testPhone = '+79001234567';
  const testPassword = 'test123';
  
  group('Auth Login - Success Case', () => {
    const response = http.post(`${BASE_URL}/api/auth/login`, 
      JSON.stringify({
        phone: testPhone,
        password: testPassword
      }), 
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    check(response, {
      'status is 200': (r) => r.status === 200,
      'has user object': (r) => {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('user');
      },
      'has profiles array': (r) => {
        const body = JSON.parse(r.body);
        return Array.isArray(body.profiles);
      },
      'has success message': (r) => {
        const body = JSON.parse(r.body);
        return body.message && body.message.includes('успешно');
      },
      'user has phone': (r) => {
        const body = JSON.parse(r.body);
        return body.user && body.user.phone === testPhone;
      },
      'user has credits': (r) => {
        const body = JSON.parse(r.body);
        return body.user && body.user.hasOwnProperty('credits');
      }
    });
  });
  
  group('Auth Login - Wrong Password', () => {
    const response = http.post(`${BASE_URL}/api/auth/login`, 
      JSON.stringify({
        phone: testPhone,
        password: 'wrongpassword123'
      }), 
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    check(response, {
      'status is 401': (r) => r.status === 401,
      'has error message': (r) => {
        const body = JSON.parse(r.body);
        return body.error && body.error.message.includes('Неверный');
      },
      'ok is false': (r) => {
        const body = JSON.parse(r.body);
        return body.ok === false;
      }
    });
  });
  
  group('Auth Login - Wrong Phone', () => {
    const wrongPhone = generatePhone();
    const response = http.post(`${BASE_URL}/api/auth/login`, 
      JSON.stringify({
        phone: wrongPhone,
        password: testPassword
      }), 
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    check(response, {
      'status is 401': (r) => r.status === 401,
      'has error message': (r) => {
        const body = JSON.parse(r.body);
        return body.error && body.error.message.includes('Неверный');
      },
      'ok is false': (r) => {
        const body = JSON.parse(r.body);
        return body.ok === false;
      }
    });
  });
  
  group('Auth Login - Empty Phone', () => {
    const response = http.post(`${BASE_URL}/api/auth/login`, 
      JSON.stringify({
        phone: '',
        password: testPassword
      }), 
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    check(response, {
      'status is 4xx': (r) => r.status >= 400 && r.status < 500,
      'not 500 error': (r) => r.status !== 500
    });
  });
  
  group('Auth Login - Empty Password', () => {
    const response = http.post(`${BASE_URL}/api/auth/login`, 
      JSON.stringify({
        phone: testPhone,
        password: ''
      }), 
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    check(response, {
      'status is 4xx': (r) => r.status >= 400 && r.status < 500,
      'not 500 error': (r) => r.status !== 500
    });
  });
  
  group('Auth Login - Missing Fields', () => {
    const response = http.post(`${BASE_URL}/api/auth/login`, 
      JSON.stringify({}), 
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    check(response, {
      'status is 4xx': (r) => r.status >= 400 && r.status < 500,
      'not 500 error': (r) => r.status !== 500
    });
  });
}
