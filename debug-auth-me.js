import http from 'k6/http';

export default function() {
  const BASE_URL = 'http://localhost:8000';
  
  console.log('\n=== Test 1: No auth ===');
  const resp1 = http.get(`${BASE_URL}/api/auth/me`);
  console.log('Status:', resp1.status);
  console.log('Body:', resp1.body);
  
  console.log('\n=== Test 2: Invalid session ===');
  const resp2 = http.get(`${BASE_URL}/api/auth/me`, {
    headers: { 'Cookie': 'sessionid=invalid_session_12345' }
  });
  console.log('Status:', resp2.status);
  console.log('Body:', resp2.body);
}
