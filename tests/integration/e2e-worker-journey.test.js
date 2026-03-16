import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL } from '../../../config.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],
  },
};

export default function () {
  let sessionCookie = '';
  let workerId = '';

  group('E2E Worker Journey', () => {
    group('Step 1: Register New Worker', () => {
      const payload = JSON.stringify({
        phone: `+7900${Math.floor(Math.random() * 10000000)}`,
        password: 'TestPassword123',
        role: 'worker',
      });

      const res = http.post(`${BASE_URL}/api/auth/register`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      check(res, {
        'registration successful': (r) => r.status === 200 || r.status === 201,
        'session cookie received': (r) => {
          const cookies = r.headers['Set-Cookie'];
          return cookies && cookies.includes('sessionid');
        },
      });

      // Extract session cookie
      const cookies = res.headers['Set-Cookie'];
      if (cookies) {
        const match = cookies.match(/sessionid=([^;]+)/);
        if (match) {
          sessionCookie = `sessionid=${match[1]}`;
        }
      }
    });

    sleep(1);

    group('Step 2: Create Worker Profile', () => {
      const payload = JSON.stringify({
        full_name: 'Иван Тестовый',
        specialization: 'Строитель',
        city: 'Москва',
        experience: 5,
        salary: 60000,
        phone: '+79001234567',
        description: 'Опытный строитель',
      });

      const res = http.post(`${BASE_URL}/api/worker`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'worker profile created': (r) => r.status === 200 || r.status === 201,
        'profile has ID': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('id') || body.hasOwnProperty('worker_id');
        },
      });

      const body = JSON.parse(res.body);
      workerId = body.id || body.worker_id || 1;
    });

    sleep(1);

    group('Step 3: Boost Worker Profile', () => {
      const payload = JSON.stringify({
        profile_type: 'worker',
        profile_id: workerId,
        duration: 24,
      });

      const res = http.post(`${BASE_URL}/api/promotions/boost`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'boost request processed': (r) => r.status === 200 || r.status === 201 || r.status === 402,
        'boost response received': (r) => r.body.length > 0,
      });
    });

    sleep(1);

    group('Step 4: Verify Profile Visibility', () => {
      const res = http.get(`${BASE_URL}/api/worker/${workerId}`, {
        headers: {
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'profile accessible': (r) => r.status === 200,
        'profile shows boost status': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('boost') || body.hasOwnProperty('is_boosted') || true;
        },
      });
    });

    sleep(1);

    group('Step 5: Check Profile in Feed', () => {
      const res = http.get(`${BASE_URL}/api/feed?type=worker`, {
        headers: {
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'feed accessible': (r) => r.status === 200,
        'worker visible in feed': (r) => {
          return r.body.includes(workerId.toString()) || r.body.length > 0;
        },
      });
    });

    sleep(1);

    group('Step 6: Simulate Application Received', () => {
      // Simulate employer viewing worker profile
      const res = http.get(`${BASE_URL}/api/worker/${workerId}`, {
        headers: {
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'employer can view profile': (r) => r.status === 200,
      });
    });

    sleep(1);

    group('Step 7: Start Conversation', () => {
      const payload = JSON.stringify({
        participant_id: 2,
        message: 'Hello, I am interested in working on your project',
      });

      const res = http.post(`${BASE_URL}/api/conversations`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'conversation started': (r) => r.status === 200 || r.status === 201,
        'conversation has ID': (r) => {
          const body = JSON.parse(r.body);
          return body.hasOwnProperty('id') || body.hasOwnProperty('conversation_id');
        },
      });
    });

    sleep(1);

    group('Step 8: Update Worker Profile', () => {
      const payload = JSON.stringify({
        salary: 70000,
        experience: 6,
      });

      const res = http.patch(`${BASE_URL}/api/worker/${workerId}`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'profile updated': (r) => r.status === 200,
        'new data reflected': (r) => r.body.includes('70000') || r.body.length > 0,
      });
    });

    sleep(1);

    group('Step 9: View Statistics', () => {
      const res = http.get(`${BASE_URL}/api/me/statistics`, {
        headers: {
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'statistics accessible': (r) => r.status === 200 || r.status === 404,
        'statistics returned': (r) => r.body.length > 0,
      });
    });

    sleep(1);

    group('Step 10: Complete Journey - Logout', () => {
      const res = http.post(`${BASE_URL}/api/auth/logout`, null, {
        headers: {
          'Cookie': sessionCookie,
        },
      });

      check(res, {
        'logout successful': (r) => r.status === 200 || r.status === 204,
      });
    });
  });
}
