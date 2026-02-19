import http from 'k6/http';
import { check, sleep } from 'k6';
import { generatePhone } from '../../../utils/generators.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.90'], // 90%+ checks pass (SMS verification can have edge cases)
    http_req_duration: ['p(95)<2000'], // 95% requests under 2s
  },
};

/**
 * SMS Verification Flow Test
 * 
 * Tests two separate flows:
 * 1. Send + Verify (for checking code validity, e.g. in UI)
 * 2. Send + Register (full registration flow)
 * 
 * Note: /sms/verify-code deletes the code after successful verification,
 * so it can't be reused for registration. Each flow is independent.
 * 
 * Tests:
 * 1. Send SMS code to new phone
 * 2. Register with SMS code (full flow)
 * 3. Verify SMS code separately (verification-only flow)
 * 4. Send code to existing phone (should fail)
 * 5. Resend code with cooldown
 * 6. Verify with wrong code
 * 7. Register without verification (should fail)
 */
export default function () {
  const headers = { 'Content-Type': 'application/json' };
  const newPhone = generatePhone();
  
  console.log(`🧪 Testing SMS verification with new phone: ${newPhone}`);
  
  // ===========================================
  // Test 1: Send SMS Code to New Phone (Success)
  // ===========================================
  console.log('\n📤 Test 1: Send SMS code to new phone...');
  const sendCodeRes = http.post(
    `${BASE_URL}/api/sms/send-code`,
    JSON.stringify({ phone: newPhone }),
    { headers }
  );
  
  console.log(`Send code status: ${sendCodeRes.status}`);
  
  const sendCodeBody = sendCodeRes.json();
  console.log('Send code response:', JSON.stringify(sendCodeBody, null, 2));
  
  const testCode = sendCodeBody.test_code;
  
  check(sendCodeRes, {
    '[Send Code] status is 200': (r) => r.status === 200,
    '[Send Code] has ok: true': (r) => r.json('ok') === true,
    '[Send Code] is test mode': (r) => r.json('test_mode') === true,
    '[Send Code] has test_code': (r) => r.json('test_code') !== undefined && r.json('test_code') !== null,
    '[Send Code] test_code is 4 digits': (r) => {
      const code = r.json('test_code');
      return typeof code === 'string' && /^\d{4}$/.test(code);
    },
    '[Send Code] has expires_in': (r) => r.json('expires_in') > 0,
  });
  
  console.log(`✅ Test code received: ${testCode}`);
  
  // ===========================================
  // Test 2: Register with SMS Code (Full Flow)
  // ===========================================
  console.log('\n📝 Test 2: Register with verified SMS (full flow)...');
  const registerRes = http.post(
    `${BASE_URL}/api/auth/register-with-sms`,
    JSON.stringify({ 
      phone: newPhone, 
      code: testCode,
      password: 'secure123'
    }),
    { headers }
  );
  
  console.log(`Register status: ${registerRes.status}`);
  console.log('Register response:', registerRes.body);
  
  check(registerRes, {
    '[Register SMS] status is 200': (r) => r.status === 200,
    '[Register SMS] has user_id': (r) => r.json('user_id') !== undefined,
    '[Register SMS] has phone': (r) => r.json('phone') === newPhone,
    '[Register SMS] has nickname': (r) => r.json('nickname') !== undefined && r.json('nickname') !== '',
    '[Register SMS] phone_verified is true': (r) => r.json('phone_verified') === true,
    '[Register SMS] has empty profiles array': (r) => {
      const profiles = r.json('profiles');
      return Array.isArray(profiles) && profiles.length === 0;
    },
  });
  
  // ===========================================
  // Test 3: Verify SMS Code Separately (Verification-Only Flow)
  // ===========================================
  console.log('\n✅ Test 3: Test verification-only flow...');
  
  // Send code to another phone
  const verifyPhone = generatePhone();
  const sendVerifyRes = http.post(
    `${BASE_URL}/api/sms/send-code`,
    JSON.stringify({ phone: verifyPhone }),
    { headers }
  );
  
  const verifyTestCode = sendVerifyRes.json('test_code');
  console.log(`Verification test code: ${verifyTestCode}`);
  
  // Verify code (without registration)
  const verifyRes = http.post(
    `${BASE_URL}/api/sms/verify-code`,
    JSON.stringify({ phone: verifyPhone, code: verifyTestCode }),
    { headers }
  );
  
  console.log(`Verify code status: ${verifyRes.status}`);
  console.log('Verify response:', verifyRes.body);
  
  check(verifyRes, {
    '[Verify Only] status is 200': (r) => r.status === 200,
    '[Verify Only] has ok: true': (r) => r.json('ok') === true,
    '[Verify Only] has verified: true': (r) => r.json('verified') === true,
  });
  
  // ===========================================
  // Test 4: Send Code to Existing Phone (Fail)
  // ===========================================
  console.log('\n❌ Test 4: Send code to existing phone (should fail)...');
  const sendExistingRes = http.post(
    `${BASE_URL}/api/sms/send-code`,
    JSON.stringify({ phone: newPhone }),
    { headers }
  );
  
  console.log(`Send to existing status: ${sendExistingRes.status}`);
  
  check(sendExistingRes, {
    '[Send Existing] status is 400': (r) => r.status === 400,
    '[Send Existing] has detail field': (r) => {
      try {
        const body = r.json();
        return body.detail !== undefined || body.ok === false;
      } catch (e) {
        return false;
      }
    },
  });
  
  // ===========================================
  // Test 5: Send Code with Cooldown (Fail)
  // ===========================================
  console.log('\n⏰ Test 5: Try resend code immediately (cooldown should block)...');
  const anotherPhone = generatePhone();
  
  // First send
  http.post(
    `${BASE_URL}/api/sms/send-code`,
    JSON.stringify({ phone: anotherPhone }),
    { headers }
  );
  
  // Immediate resend (should fail due to cooldown)
  const resendRes = http.post(
    `${BASE_URL}/api/sms/resend-code`,
    JSON.stringify({ phone: anotherPhone }),
    { headers }
  );
  
  console.log(`Resend status: ${resendRes.status}`);
  
  check(resendRes, {
    '[Resend Cooldown] status is 4xx': (r) => r.status >= 400 && r.status < 500,
    '[Resend Cooldown] has response body': (r) => {
      try {
        const body = r.json();
        return body !== null;
      } catch (e) {
        return false;
      }
    },
  });
  
  // ===========================================
  // Test 6: Verify with Wrong Code (Fail)
  // ===========================================
  console.log('\n🔐 Test 6: Verify with wrong code...');
  const wrongCodePhone = generatePhone();
  
  // Send code first
  const sendWrongRes = http.post(
    `${BASE_URL}/api/sms/send-code`,
    JSON.stringify({ phone: wrongCodePhone }),
    { headers }
  );
  
  const sendWrongSuccess = sendWrongRes.status === 200;
  console.log(`Send code for wrong verification: ${sendWrongSuccess}`);
  
  // Verify with wrong code
  const verifyWrongRes = http.post(
    `${BASE_URL}/api/sms/verify-code`,
    JSON.stringify({ phone: wrongCodePhone, code: '0000' }),
    { headers }
  );
  
  console.log(`Verify wrong code status: ${verifyWrongRes.status}`);
  
  check(verifyWrongRes, {
    '[Wrong Code] status is 400': (r) => r.status === 400,
    '[Wrong Code] has error info': (r) => {
      try {
        const body = r.json();
        return body.detail !== undefined || body.ok === false;
      } catch (e) {
        return false;
      }
    },
  });
  
  // ===========================================
  // Test 7: Register Without Verification (Fail)
  // ===========================================
  console.log('\n⛔ Test 7: Try register without verification...');
  const unverifiedPhone = generatePhone();
  
  const registerUnverifiedRes = http.post(
    `${BASE_URL}/api/auth/register-with-sms`,
    JSON.stringify({ 
      phone: unverifiedPhone, 
      code: '9999',
      password: 'secure123'
    }),
    { headers }
  );
  
  console.log(`Register unverified status: ${registerUnverifiedRes.status}`);
  
  check(registerUnverifiedRes, {
    '[Register Unverified] status is 400': (r) => r.status === 400,
    '[Register Unverified] has error info': (r) => {
      try {
        const body = r.json();
        return body.detail !== undefined || body.ok === false || body.error !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  // ===========================================
  // Test 8: Missing Fields Validation
  // ===========================================
  console.log('\n📋 Test 8: Test missing fields...');
  
  // Send code without phone
  const sendNoPhoneRes = http.post(
    `${BASE_URL}/api/sms/send-code`,
    JSON.stringify({}),
    { headers }
  );
  
  check(sendNoPhoneRes, {
    '[Missing Phone] status is 4xx': (r) => r.status >= 400 && r.status < 500,
  });
  
  // Verify without code
  const verifyNoCodeRes = http.post(
    `${BASE_URL}/api/sms/verify-code`,
    JSON.stringify({ phone: newPhone }),
    { headers }
  );
  
  check(verifyNoCodeRes, {
    '[Missing Code] status is 4xx': (r) => r.status >= 400 && r.status < 500,
  });
  
  console.log('\n✅ SMS verification tests completed!');
  
  sleep(1);
}
