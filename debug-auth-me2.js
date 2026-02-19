import http from 'k6/http';
import { check, group } from 'k6';

export default function() {
  const BASE_URL = 'http://localhost:8000';
  
  group('Test Without Auth', () => {
    console.log('\n=== Testing unauthenticated request ===');
    const response = http.get(`${BASE_URL}/api/auth/me`);
    console.log(`Status code: ${response.status}`);
    console.log(`Status is 401: ${response.status === 401}`);
    console.log(`Status is 403: ${response.status === 403}`);
    console.log(`Status is 401 or 403: ${response.status === 401 || response.status === 403}`);
    
    const result = check(response, {
      'status is 401 or 403': (r) => {
        console.log(`Inside check: r.status = ${r.status}`);
        const isOk = r.status === 401 || r.status === 403;
        console.log(`Check result: ${isOk}`);
        return isOk;
      },
    });
    
    console.log(`Check result object:`, JSON.stringify(result));
  });
  
  group('Test With Invalid Session', () => {
    console.log('\n=== Testing with invalid session ===');
    const response = http.get(`${BASE_URL}/api/auth/me`, {
      headers: { 'Cookie': 'sessionid=invalid_123' }
    });
    console.log(`Status code: ${response.status}`);
    
    check(response, {
      'status is 401 or 403': (r) => r.status === 401 || r.status === 403,
    });
  });
}
