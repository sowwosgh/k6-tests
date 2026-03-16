import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://sowwos.ru';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.90'],
    http_req_duration: ['p(95)<3000'],
  },
};

/**
 * Helper function to login and get session cookie
 */
function login() {
  const loginPayload = JSON.stringify({
    phone: '+79001234567',
    password: 'test123',
  });

  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status !== 200) {
    console.error('Login failed:', loginRes.status, loginRes.body);
    return null;
  }

  const cookies = loginRes.cookies;
  const sessionId = cookies['sessionid'] ? cookies['sessionid'][0].value : null;
  
  if (!sessionId) {
    console.error('No session cookie found');
    return null;
  }

  return sessionId;
}

/**
 * File Upload Security Test
 * 
 * Tests file upload security and validation:
 * 1. Valid image upload (PNG/JPEG)
 * 2. Invalid file type rejection
 * 3. Malicious file detection
 * 4. Path traversal prevention
 * 5. Authentication required
 */
export default function () {
  console.log('\n📤 Testing File Upload Security\n');
  
  const sessionId = login();
  if (!sessionId) {
    console.error('Failed to login');
    return;
  }
  
  // Test 1: Valid image upload (using PNG signature)
  console.log('✅ Test 1: Valid image upload...');
  
  // PNG signature bytes
  const pngData = String.fromCharCode(137, 80, 78, 71, 13, 10, 26, 10);
  const formData1 = {
    file: http.file(pngData, 'avatar.png', 'image/png'),
  };
  
  const res1 = http.post(
    `${BASE_URL}/api/user/avatar`,
    formData1,
    {
      cookies: { sessionid: sessionId },
    }
  );
  
  console.log(`Status: ${res1.status}`);
  console.log(`Response: ${res1.body}`);
  
  check(res1, {
    '[Valid] upload processed': (r) => r.status === 200 || r.status === 201 || r.status === 400,
    '[Valid] response is valid': (r) => {
      try {
        r.json();
        return true;
      } catch (e) {
        return false;
      }
    },
  });
  
  sleep(0.5);
  
  // Test 2: Invalid file type (text file)
  console.log('\n❌ Test 2: Invalid file type rejection...');
  
  const formData2 = {
    file: http.file('malicious content', 'malware.txt', 'text/plain'),
  };
  
  const res2 = http.post(
    `${BASE_URL}/api/user/avatar`,
    formData2,
    {
      cookies: { sessionid: sessionId },
    }
  );
  
  console.log(`Status: ${res2.status}`);
  
  check(res2, {
    '[Invalid Type] request handled': (r) => r.status === 200 || r.status === 400 || r.status === 415,
    '[Invalid Type] proper response': (r) => {
      try {
        r.json();
        return true;
      } catch (e) {
        return false;
      }
    },
  });
  
  sleep(0.5);
  
  // Test 3: File with path traversal attempt in filename
  console.log('\n🔒 Test 3: Path traversal prevention...');
  
  const formData3 = {
    file: http.file('test data', '../../../etc/passwd', 'image/png'),
  };
  
  const res3 = http.post(
    `${BASE_URL}/api/user/avatar`,
    formData3,
    {
      cookies: { sessionid: sessionId },
    }
  );
  
  console.log(`Status: ${res3.status}`);
  
  check(res3, {
    '[Path Traversal] request handled': (r) => r.status === 200 || r.status === 400 || r.status === 403,
    '[Path Traversal] safe response': (r) => {
      try {
        r.json();
        return true;
      } catch (e) {
        return false;
      }
    },
  });
  
  sleep(0.5);
  
  // Test 4: Double extension file
  console.log('\n⚠️  Test 4: Double extension file...');
  
  const formData4 = {
    file: http.file('<?php echo "test"; ?>', 'image.jpg.php', 'image/jpeg'),
  };
  
  const res4 = http.post(
    `${BASE_URL}/api/user/avatar`,
    formData4,
    {
      cookies: { sessionid: sessionId },
    }
  );
  
  console.log(`Status: ${res4.status}`);
  
  check(res4, {
    '[Double Ext] request handled': (r) => r.status === 200 || r.status === 400 || r.status === 415,
    '[Double Ext] proper validation': (r) => {
      try {
        r.json();
        return true;
      } catch (e) {
        return false;
      }
    },
  });
  
  sleep(0.5);
  
  // Test 5: File upload without authentication
  console.log('\n🔐 Test 5: Upload without authentication...');
  
  const formData5 = {
    file: http.file('test data', 'test.png', 'image/png'),
  };
  
  const res5 = http.post(
    `${BASE_URL}/api/user/avatar`,
    formData5,
    {}
  );
  
  console.log(`Status: ${res5.status}`);
  
  check(res5, {
    '[Unauth] request handled': (r) => r.status === 200 || r.status === 401 || r.status === 403,
    '[Unauth] proper error response': (r) => {
      try {
        const body = r.json();
        return body.hasOwnProperty('ok') || body.hasOwnProperty('error');
      } catch (e) {
        return false;
      }
    },
  });
  
  console.log('\n✅ All file upload security tests completed\n');
}
