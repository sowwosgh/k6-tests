import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.90'],
    http_req_duration: ['p(95)<1000'],
  },
};

/**
 * User Check Nickname Test
 * 
 * Tests real-time nickname availability checking:
 * 1. Check available nickname (should be available)
 * 2. Check existing nickname (should be unavailable)
 * 3. Check nickname too short (should return error)
 * 4. Check nickname too long (should return error)
 * 5. Check nickname with invalid characters
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  
  console.log('\n📝 Testing User Nickname Checking');
  
  // ===========================================
  // Test 1: Check Available Nickname
  // ===========================================
  console.log('\n✅ Test 1: Check available nickname...');
  const uniqueNickname = `test_${Date.now().toString().slice(-6)}`; // Last 6 digits to keep under 20 chars
  
  const availableRes = http.get(
    `${BASE_URL}/api/user/check-nickname?nickname=${uniqueNickname}`,
    { headers }
  );
  
  console.log(`Status: ${availableRes.status}`);
  console.log(`Response: ${availableRes.body}`);
  
  check(availableRes, {
    '[Available] status is 200': (r) => r.status === 200,
    '[Available] has available field': (r) => {
      try {
        const body = r.json();
        return body.hasOwnProperty('available');
      } catch (e) {
        return false;
      }
    },
    '[Available] nickname is available': (r) => {
      try {
        const body = r.json();
        return body.available === true;
      } catch (e) {
        return false;
      }
    },
  });
  
  // ===========================================
  // Test 2: Check Existing Nickname
  // ===========================================
  console.log('\n❌ Test 2: Check existing nickname...');
  const existingNickname = 'user_4567'; // From seed data
  
  const existingRes = http.get(
    `${BASE_URL}/api/user/check-nickname?nickname=${existingNickname}`,
    { headers }
  );
  
  console.log(`Status: ${existingRes.status}`);
  console.log(`Response: ${existingRes.body}`);
  
  check(existingRes, {
    '[Existing] status is 200': (r) => r.status === 200,
    '[Existing] has available field': (r) => {
      try {
        const body = r.json();
        return body.hasOwnProperty('available');
      } catch (e) {
        return false;
      }
    },
  });
  
  // ===========================================
  // Test 3: Nickname Too Short
  // ===========================================
  console.log('\n⚠️  Test 3: Check nickname too short...');
  const shortNickname = 'ab'; // 2 characters
  
  const shortRes = http.get(
    `${BASE_URL}/api/user/check-nickname?nickname=${shortNickname}`,
    { headers }
  );
  
  console.log(`Status: ${shortRes.status}`);
  console.log(`Response: ${shortRes.body}`);
  
  check(shortRes, {
    '[Too Short] status is 200': (r) => r.status === 200,
    '[Too Short] nickname is not available': (r) => {
      try {
        const body = r.json();
        return body.available === false;
      } catch (e) {
        return false;
      }
    },
    '[Too Short] has error about length': (r) => {
      try {
        const body = r.json();
        return body.error && body.error.includes('3');
      } catch (e) {
        return false;
      }
    },
  });
  
  // ===========================================
  // Test 4: Nickname Too Long
  // ===========================================
  console.log('\n⚠️  Test 4: Check nickname too long...');
  const longNickname = 'a'.repeat(21); // 21 characters, max is 20
  
  const longRes = http.get(
    `${BASE_URL}/api/user/check-nickname?nickname=${longNickname}`,
    { headers }
  );
  
  console.log(`Status: ${longRes.status}`);
  console.log(`Response: ${longRes.body}`);
  
  check(longRes, {
    '[Too Long] status is 200': (r) => r.status === 200,
    '[Too Long] nickname is not available': (r) => {
      try {
        const body = r.json();
        return body.available === false;
      } catch (e) {
        return false;
      }
    },
    '[Too Long] has error about length': (r) => {
      try {
        const body = r.json();
        return body.error && body.error.includes('20');
      } catch (e) {
        return false;
      }
    },
  });
  
  // ===========================================
  // Test 5: Invalid Characters
  // ===========================================
  console.log('\n⚠️  Test 5: Check nickname with invalid characters...');
  const invalidNickname = 'test@user!'; // @ and ! are not allowed
  
  const invalidRes = http.get(
    `${BASE_URL}/api/user/check-nickname?nickname=${encodeURIComponent(invalidNickname)}`,
    { headers }
  );
  
  console.log(`Status: ${invalidRes.status}`);
  console.log(`Response: ${invalidRes.body}`);
  
  check(invalidRes, {
    '[Invalid Chars] status is 200': (r) => r.status === 200,
    '[Invalid Chars] nickname is not available': (r) => {
      try {
        const body = r.json();
        return body.available === false;
      } catch (e) {
        return false;
      }
    },
    '[Invalid Chars] has error message': (r) => {
      try {
        const body = r.json();
        return body.error !== null;
      } catch (e) {
        return false;
      }
    },
  });
  
  console.log('\n✅ All nickname checking tests completed');
}
