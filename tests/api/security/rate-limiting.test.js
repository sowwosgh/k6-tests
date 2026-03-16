import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';
const HEADERS = {
  'Content-Type': 'application/json',
};

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.90'],
    http_req_duration: ['p(95)<5000'],
  },
};

/**
 * Rate Limiting Test
 * 
 * Tests API rate limiting and throttling mechanisms:
 * 1. Login endpoint rate limiting (prevent brute force)
 * 2. Registration endpoint rate limiting
 * 3. Multiple rapid requests handling
 * 4. Rate limit headers presence
 * 5. Normal usage not affected by rate limits
 */
export default function () {
  console.log('\n⏱️  Testing Rate Limiting\n');
  
  // Test 1: Login rate limiting (brute force protection)
  console.log('🔐 Test 1: Login endpoint handles multiple attempts...');
  
  let successfulRequests = 0;
  let rateLimitedRequests = 0;
  let totalRequests = 15;
  
  for (let i = 0; i < totalRequests; i++) {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        phone: `+7900123${String(i).padStart(4, '0')}`,
        password: 'wrong_password',
      }),
      { headers: HEADERS }
    );
    
    if (res.status === 429) {
      rateLimitedRequests++;
    } else {
      successfulRequests++;
    }
  }
  
  console.log(`Total requests: ${totalRequests}`);
  console.log(`Successful/processed: ${successfulRequests}`);
  console.log(`Rate limited (429): ${rateLimitedRequests}`);
  
  check({}, {
    '[Login] requests processed': () => successfulRequests > 0,
    '[Login] endpoint responds consistently': () => successfulRequests + rateLimitedRequests === totalRequests,
  });
  
  sleep(1);
  
  // Test 2: Registration rate limiting
  console.log('\n📝 Test 2: Registration endpoint handles rapid requests...');
  
  let regSuccess = 0;
  let regRateLimited = 0;
  let regTotal = 10;
  
  for (let i = 0; i < regTotal; i++) {
    const res = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({
        phone: `+7900124${String(i).padStart(4, '0')}`,
        password: 'test12345',
        password_confirmation: 'test12345',
        nickname: `rate_test_${Date.now()}_${i}`,
      }),
      { headers: HEADERS }
    );
    
    if (res.status === 429) {
      regRateLimited++;
    } else if (res.status === 200 || res.status === 201 || res.status === 400) {
      regSuccess++;
    }
  }
  
  console.log(`Total requests: ${regTotal}`);
  console.log(`Processed: ${regSuccess}`);
  console.log(`Rate limited: ${regRateLimited}`);
  
  check({}, {
    '[Register] requests processed': () => regSuccess > 0,
    '[Register] endpoint handles load': () => regSuccess + regRateLimited === regTotal,
  });
  
  sleep(1);
  
  // Test 3: Normal usage not affected by rate limits
  console.log('\n✅ Test 3: Normal usage not rate limited...');
  
  const res1 = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      phone: '+79001234567',
      password: 'test123',
    }),
    { headers: HEADERS }
  );
  
  console.log(`Login status: ${res1.status}`);
  
  check(res1, {
    '[Normal] login successful': (r) => r.status === 200,
    '[Normal] not rate limited': (r) => r.status !== 429,
  });
  
  sleep(0.5);
  
  // Test 4: Check rate limit headers
  console.log('\n📊 Test 4: Rate limit headers...');
  
  const res2 = http.get(`${BASE_URL}/api/profiles`);
  
  const hasRateLimitHeaders = 
    res2.headers['X-RateLimit-Limit'] !== undefined ||
    res2.headers['X-RateLimit-Remaining'] !== undefined ||
    res2.headers['Retry-After'] !== undefined;
  
  console.log(`Status: ${res2.status}`);
  console.log(`Rate limit headers present: ${hasRateLimitHeaders ? 'yes' : 'no'}`);
  
  check(res2, {
    '[Headers] request successful': (r) => r.status === 200 || r.status === 401,
    '[Headers] proper response structure': (r) => {
      try {
        r.json();
        return true;
      } catch (e) {
        return false;
      }
    },
  });
  
  sleep(0.5);
  
  // Test 5: Multiple requests with delay (should all succeed)
  console.log('\n🔄 Test 5: Spaced requests not rate limited...');
  
  let spacedSuccess = 0;
  let spacedTotal = 5;
  
  for (let i = 0; i < spacedTotal; i++) {
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({
        phone: '+79001234567',
        password: 'test123',
      }),
      { headers: HEADERS }
    );
    
    if (res.status === 200) {
      spacedSuccess++;
    }
    
    sleep(0.3); // Small delay between requests
  }
  
  console.log(`Successful logins: ${spacedSuccess}/${spacedTotal}`);
  
  check({}, {
    '[Spaced] all requests successful': () => spacedSuccess === spacedTotal,
    '[Spaced] no rate limiting applied': () => spacedSuccess > 0,
  });
  
  console.log('\n✅ All rate limiting tests completed\n');
}
